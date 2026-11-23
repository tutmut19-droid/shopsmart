"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const ROLE_KEY = "msaada-role";
type Role = "admin" | "field";

function hasStoredSession() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) ?? "";
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) return true;
    }
  } catch {}
  return false;
}

export default function AuthGate({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<Role>("field");

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    async function check() {
      const wait = (ms: number) => new Promise<null>((resolve) => setTimeout(() => resolve(null), ms));

      const session = await Promise.race([
        supabase.auth.getSession().then(({ data }) => data.session),
        wait(4000),
      ]);
      if (!session && !hasStoredSession()) {
        router.replace("/login");
        return;
      }

      let current: Role = localStorage.getItem(ROLE_KEY) === "admin" ? "admin" : "field";
      if (session) {
        const result = await Promise.race([
          supabase
            .from("staff_roles")
            .select("role")
            .eq("user_id", session.user.id)
            .maybeSingle()
            .then((res) => res),
          wait(4000),
        ]);
        if (result && !result.error) {
          current = result.data?.role === "admin" ? "admin" : "field";
          localStorage.setItem(ROLE_KEY, current);
        }
      }
      setRole(current);
      setReady(true);
    }
    check();
  }, [router]);

  if (!ready) return <p className="p-8">Checking login...</p>;

  return (
    <>
      <nav className="flex items-center justify-between border-b p-4 text-sm">
        <div className="flex gap-4">
          <Link href="/register" className="underline">Register</Link>
          <Link href="/distribute" className="underline">Distribute</Link>
          {role === "admin" && (
            <Link href="/dashboard" className="underline">Dashboard</Link>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-500">{role === "admin" ? "Admin" : "Field staff"}</span>
          <button
            className="underline"
            onClick={async () => {
              localStorage.removeItem(ROLE_KEY);
              await supabase.auth.signOut();
              router.replace("/login");
            }}
          >
            Log out
          </button>
        </div>
      </nav>
      {adminOnly && role !== "admin" ? (
        <main className="mx-auto max-w-2xl p-8">
          <h1 className="text-2xl font-bold">Administrators only</h1>
          <p className="mt-2">Your account does not have access to this page.</p>
          <Link href="/register" className="mt-4 inline-block underline">Back to Register</Link>
        </main>
      ) : (
        children
      )}
    </>
  );
}