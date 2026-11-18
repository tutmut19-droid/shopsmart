"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
      else setReady(true);
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