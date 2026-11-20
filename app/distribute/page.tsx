"use client";
import { useCallback, useEffect, useRef, useState } from "react";
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
  recorded_by: string | null;
  beneficiaries: { name: string; ref: string } | null;
};
type Pending = {
  key: string;
  beneficiary_id: number;
  name: string;
  item: string;
  quantity: number;
  given_at: string;
};

const QUEUE_KEY = "msaada-pending-distributions";
const PEOPLE_KEY = "msaada-people-cache";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export default function Distribute() {
  const [people, setPeople] = useState<Person[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [online, setOnline] = useState(true);
  const [search, setSearch] = useState("");
  const [item, setItem] = useState("Food parcel");
  const [quantity, setQuantity] = useState("1");
  const [message, setMessage] = useState("");
  const syncing = useRef(false);

  const load = useCallback(async () => {
    const p = await supabase
      .from("beneficiaries")
      .select("id,name,location,ref")
      .order("name");
    if (!p.error && p.data) {
      setPeople(p.data as Person[]);
      writeJson(PEOPLE_KEY, p.data);
    } else {
      setPeople((prev) => (prev.length ? prev : readJson<Person[]>(PEOPLE_KEY, [])));
    }
    const d = await supabase
      .from("distributions")
      .select("id,item,quantity,given_at,recorded_by,beneficiaries(name,ref)")
      .order("given_at", { ascending: false })
      .limit(20);
    if (!d.error && d.data) setRows(d.data as unknown as Row[]);
  }, []);

  const sync = useCallback(async () => {
    if (syncing.current) return;
    let queue = readJson<Pending[]>(QUEUE_KEY, []);
    if (queue.length === 0) return;
    syncing.current = true;
    await supabase.auth.getSession(); // refresh the login if it expired
    let saved = 0;
    let rejected = 0;
    for (const entry of [...queue]) {
      const { error } = await supabase.from("distributions").insert({
        beneficiary_id: entry.beneficiary_id,
        item: entry.item,
        quantity: entry.quantity,
        given_at: entry.given_at,
      });
      if (error && !(error.code?.startsWith("23") || error.code?.startsWith("22"))) break; // keep the entry unless the data itself is invalid
      if (error) rejected++;
      else saved++;
      queue = queue.filter((q) => q.key !== entry.key);
      writeJson(QUEUE_KEY, queue);
    }
    setPending(readJson<Pending[]>(QUEUE_KEY, []));
    syncing.current = false;
    if (saved || rejected) {
      setMessage(
        `Uploaded ${saved} distribution(s).` +
          (rejected ? ` ${rejected} could not be saved.` : "")
      );
    }
    await load();
  }, [load]);

  useEffect(() => {
    setOnline(navigator.onLine);
    setPending(readJson<Pending[]>(QUEUE_KEY, []));
    setPeople(readJson<Person[]>(PEOPLE_KEY, []));
    load();
    sync();
    const goOnline = () => {
      setOnline(true);
      sync();
      load();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [load, sync]);

  function saveOffline(p: Person) {
    const entry: Pending = {
      key: `${Date.now()}-${Math.random()}`,
      beneficiary_id: p.id,
      name: p.name,
      item,
      quantity: Number(quantity),
      given_at: new Date().toISOString(),
    };
    const queue = [...readJson<Pending[]>(QUEUE_KEY, []), entry];
    writeJson(QUEUE_KEY, queue);
    setPending(queue);
    setMessage(
      `Saved on this device: ${item} x${quantity} for ${p.name}. It will upload when the internet is back.`
    );
  }

  async function give(p: Person) {
    const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
    let lastDate: string | null = null;

    const queued = readJson<Pending[]>(QUEUE_KEY, []).filter(
      (q) =>
        q.beneficiary_id === p.id &&
        q.item === item &&
        new Date(q.given_at).getTime() >= since
    );
    if (queued.length) lastDate = queued[queued.length - 1].given_at;

    if (!lastDate) {
      const recent = rows.find(
        (r) =>
          r.beneficiaries?.ref === p.ref &&
          r.item === item &&
          new Date(r.given_at).getTime() >= since
      );
      if (recent) lastDate = recent.given_at;
    }

    if (!lastDate && navigator.onLine) {
      const { data: previous } = await supabase
        .from("distributions")
        .select("given_at")
        .eq("beneficiary_id", p.id)
        .eq("item", item)
        .gte("given_at", new Date(since).toISOString())
        .order("given_at", { ascending: false })
        .limit(1);
      if (previous && previous.length > 0) lastDate = previous[0].given_at;
    }

    if (lastDate) {
      const ok = window.confirm(
        `${p.name} already received ${item} on ${new Date(lastDate).toLocaleDateString()} (within the last 30 days). Record it again?`
      );
      if (!ok) {
        setMessage("Cancelled: duplicate not recorded.");
        return;
      }
    }

    if (!navigator.onLine) {
      saveOffline(p);
      return;
    }

    const { error } = await supabase
      .from("distributions")
      .insert({ beneficiary_id: p.id, item, quantity: Number(quantity) });
    if (error) {
      if (!error.code) saveOffline(p); // network failure
      else setMessage(error.message);
      return;
    }
    setMessage(`Recorded: ${item} x${quantity} for ${p.name}`);
    await load();
  }

  const q = search.toLowerCase();
  const matches = q
    ? people.filter(
        (p) => p.name.toLowerCase().includes(q) || p.ref.toLowerCase().includes(q)
      )
    : [];

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-3xl font-bold">Aid Distribution</h1>

      {!online && (
        <p className="mt-4 rounded bg-yellow-100 p-2 text-yellow-900">
          You are offline. Distributions are saved on this device and will upload automatically.
        </p>
      )}

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

      {pending.length > 0 && (
        <>
          <h2 className="mt-8 text-xl font-semibold">Waiting to upload ({pending.length})</h2>
          <button onClick={() => sync()} className="mt-2 underline">
            Upload now
          </button>
          <ul className="mt-2 grid gap-2">
            {pending.map((p) => (
              <li key={p.key} className="rounded border border-yellow-400 bg-yellow-50 p-3">
                {p.name} · {p.item} x{p.quantity} · {new Date(p.given_at).toLocaleString()}
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="mt-8 text-xl font-semibold">Recent distributions ({rows.length})</h2>
      <ul className="mt-2 grid gap-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded border p-3">
            {r.beneficiaries?.name} · {r.item} x{r.quantity} · {new Date(r.given_at).toLocaleString()} · by {r.recorded_by ?? "unknown"}
          </li>
        ))}
      </ul>
    </main>
  );
}