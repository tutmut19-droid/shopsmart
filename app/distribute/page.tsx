"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Person = { id: number; name: string; location: string; ref: string };
type Row = {
  id: number;
  item: string;
  quantity: number;
  given_at: string;
  beneficiaries: { name: string; ref: string } | null;
};

export default function Distribute() {
  const [people, setPeople] = useState<Person[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [item, setItem] = useState("Food parcel");
  const [quantity, setQuantity] = useState("1");
  const [message, setMessage] = useState("");

  async function load() {
    const p = await supabase
      .from("beneficiaries")
      .select("id,name,location,ref")
      .order("name");
    setPeople((p.data ?? []) as Person[]);
    const d = await supabase
      .from("distributions")
      .select("id,item,quantity,given_at,beneficiaries(name,ref)")
      .order("given_at", { ascending: false })
      .limit(20);
    setRows((d.data ?? []) as unknown as Row[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function give(p: Person) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: previous } = await supabase
      .from("distributions")
      .select("given_at")
      .eq("beneficiary_id", p.id)
      .eq("item", item)
      .gte("given_at", since)
      .order("given_at", { ascending: false })
      .limit(1);

    if (previous && previous.length > 0) {
      const when = new Date(previous[0].given_at).toLocaleDateString();
      const ok = window.confirm(
        `${p.name} already received ${item} on ${when} (within the last 30 days). Record it again?`
      );
      if (!ok) {
        setMessage("Cancelled: duplicate not recorded.");
        return;
      }
    }

    const { error } = await supabase
      .from("distributions")
      .insert({ beneficiary_id: p.id, item, quantity: Number(quantity) });
    setMessage(error ? error.message : `Recorded: ${item} x${quantity} for ${p.name}`);
    if (!error) await load();
  }

  const q = search.toLowerCase();
  const matches = q
    ? people.filter((p) => p.name.toLowerCase().includes(q) || p.ref.toLowerCase().includes(q))
    : [];

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-3xl font-bold">Aid Distribution</h1>
      <div className="mt-6 grid gap-3">
        <input
          className="rounded border p-2"
          placeholder="Search by name or ID number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <select className="rounded border p-2" value={item} onChange={(e) => setItem(e.target.value)}>
            <option>Food parcel</option>
            <option>Cash</option>
            <option>School kit</option>
            <option>Other</option>
          </select>
          <input
            className="rounded border p-2"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
        {message && <p className="text-green-700">{message}</p>}
      </div>

      <ul className="mt-4 grid gap-2">
        {matches.map((p) => (
          <li key={p.id} className="flex items-center justify-between rounded border p-3">
            <span>
              {p.name} · {p.location} · Ref: {p.ref}
            </span>
            <button onClick={() => give(p)} className="rounded bg-black px-3 py-1 text-white">
              Received
            </button>
          </li>
        ))}
      </ul>

      <h2 className="mt-8 text-xl font-semibold">Recent distributions ({rows.length})</h2>
      <ul className="mt-2 grid gap-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded border p-3">
            {r.beneficiaries?.name} · {r.item} x{r.quantity} · {new Date(r.given_at).toLocaleString()}
          </li>
        ))}
      </ul>
    </main>
  );
}