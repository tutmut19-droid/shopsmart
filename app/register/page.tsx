"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Person = { id: number; name: string; household: number; location: string; ref: string };

export default function Register() {
  const [people, setPeople] = useState<Person[]>([]);
  const [name, setName] = useState("");
  const [household, setHousehold] = useState("");
  const [location, setLocation] = useState("");
  const [ref, setRef] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const { data } = await supabase
      .from("beneficiaries")
      .select("*")
      .order("created_at", { ascending: false });
    setPeople(data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase
      .from("beneficiaries")
      .insert({ name, household: Number(household), location, ref });
    if (error) {
      setError(error.code === "23505" ? "This reference number is already registered." : error.message);
      return;
    }
    setName(""); setHousehold(""); setLocation(""); setRef(""); setError("");
    await load();
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-3xl font-bold">Beneficiary Registration</h1>
      <form onSubmit={submit} className="mt-6 grid gap-3">
        <input className="rounded border p-2" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="rounded border p-2" type="number" min="1" placeholder="Household size" value={household} onChange={(e) => setHousehold(e.target.value)} required />
        <input className="rounded border p-2" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} required />
        <input className="rounded border p-2" placeholder="ID or reference number" value={ref} onChange={(e) => setRef(e.target.value)} required />
        {error && <p className="text-red-600">{error}</p>}
        <button className="rounded bg-black p-2 text-white">Register</button>
      </form>
      <h2 className="mt-8 text-xl font-semibold">Registered ({people.length})</h2>
      <ul className="mt-2 grid gap-2">
        {people.map((p) => (
          <li key={p.id} className="rounded border p-3">
            {p.name} · {p.location} · Household: {p.household} · Ref: {p.ref}
          </li>
        ))}
      </ul>
    </main>
  );
}