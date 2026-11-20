"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

function hasStoredSession() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) ?? "";
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) return true;
    }
  } catch {}
  return false;
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000));
    Promise.race([
      supabase.auth.getSession().then(({ data }) => data.session),
      timeout,
    ]).then((session) => {
      if (session || hasStoredSession()) setReady(true);
      else router.replace("/login");
    });
  }, [router]);

  if (!ready) return <p className="p-8">Checking login...</p>;

  return (
    <>
      <nav className="flex items-center justify-between border-b p-4 text-sm">
        <div className="flex gap-4">
          <Link href="/register" className="underline">Register</Link>
          <Link href="/distribute" className="underline">Distribute</Link>
          <Link href="/dashboard" className="underline">Dashboard</Link>
        </div>
        <button
          className="underline"
          onClick={async () => {
            await supabase.auth.signOut();
            router.replace("/login");
          }}
        >
          Log out
        </button>
      </nav>
      {children}
    </>
  );
}