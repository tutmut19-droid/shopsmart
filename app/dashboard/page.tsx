"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Person = { id: number; household: number; location: string };
type Dist = {
  id: number;
  item: string;
  quantity: number;
  given_at: string;
  recorded_by: string | null;
  beneficiaries: { name: string; ref: string; location: string } | null;
};

export default function Dashboard() {
  const [people, setPeople] = useState<Person[]>([]);
  const [dists, setDists] = useState<Dist[]>([]);

  useEffect(() => {
    async function load() {
      const p = await supabase.from("beneficiaries").select("id,household,location");
      setPeople((p.data ?? []) as Person[]);
      const d = await supabase
        .from("distributions")
        .select("id,item,quantity,given_at,recorded_by,beneficiaries(name,ref,location)")
        .order("given_at", { ascending: false });
      setDists((d.data ?? []) as unknown as Dist[]);
    }
    load();
  }, []);

  const totalHousehold = people.reduce((sum, p) => sum + p.household, 0);

  const byItem: Record<string, number> = {};
  dists.forEach((d) => {
    byItem[d.item] = (byItem[d.item] ?? 0) + d.quantity;
  });

  const byLocation: Record<string, { people: number; given: number }> = {};
  people.forEach((p) => {
    byLocation[p.location] = byLocation[p.location] ?? { people: 0, given: 0 };
    byLocation[p.location].people += 1;
  });
  dists.forEach((d) => {
    const loc = d.beneficiaries?.location ?? "Unknown";
    byLocation[loc] = byLocation[loc] ?? { people: 0, given: 0 };
    byLocation[loc].given += 1;
  });

  function exportCsv() {
    const esc = (v: string | number) => {
      let s = String(v);
      if (/^[=+\-@]/.test(s)) s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    };
    const header = ["Name", "ID", "Location", "Item", "Quantity", "Date", "Recorded by"];
    const lines = dists.map((d) =>
      [
        d.beneficiaries?.name ?? "",
        d.beneficiaries?.ref ?? "",
        d.beneficiaries?.location ?? "",
        d.item,
        d.quantity,
        new Date(d.given_at).toLocaleString(),
        d.recorded_by ?? "",
      ]
        .map(esc)
        .join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "distributions.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <button onClick={exportCsv} className="rounded bg-black px-3 py-2 text-white">
          Export CSV
        </button>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded border p-4">
          <p className="text-sm text-gray-600">People registered</p>
          <p className="text-2xl font-bold">{people.length}</p>
        </div>
        <div className="rounded border p-4">
          <p className="text-sm text-gray-600">Household members</p>
          <p className="text-2xl font-bold">{totalHousehold}</p>
        </div>
        <div className="rounded border p-4">
          <p className="text-sm text-gray-600">Distributions</p>
          <p className="text-2xl font-bold">{dists.length}</p>
        </div>
      </div>

      <h2 className="mt-8 text-xl font-semibold">Total given by item</h2>
      <ul className="mt-2 grid gap-2">
        {Object.entries(byItem).map(([item, qty]) => (
          <li key={item} className="flex justify-between rounded border p-3">
            <span>{item}</span>
            <span className="font-semibold">{qty}</span>
          </li>
        ))}
      </ul>

      <h2 className="mt-8 text-xl font-semibold">By location</h2>
      <ul className="mt-2 grid gap-2">
        {Object.entries(byLocation).map(([loc, v]) => (
          <li key={loc} className="flex justify-between rounded border p-3">
            <span>{loc}</span>
            <span>
              {v.people} registered · {v.given} distributions
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}