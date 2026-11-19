"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Person = {
  id: number;
  name: string;
  household: number;
  location: string;
  ref: string;
  recorded_by: string | null;
};
type Pending = { name: string; household: number; location: string; ref: string };

const QUEUE_KEY = "msaada-pending-registrations";

function readQueue(): Pending[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function writeQueue(q: Pending[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

export default function Register() {
  const [people, setPeople] = useState<Person[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [online, setOnline] = useState(true);
  const [name, setName] = useState("");
  const [household, setHousehold] = useState("");
  const [location, setLocation] = useState("");
  const [ref, setRef] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const syncing = useRef(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("beneficiaries")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setPeople(data as Person[]);
  }, []);

  const sync = useCallback(async () => {
    if (syncing.current) return;
    let queue = readQueue();
    if (queue.length === 0) return;
    syncing.current = true;
    let saved = 0;
    let duplicates = 0;
    for (const item of [...queue]) {
      const { error } = await supabase.from("beneficiaries").insert(item);
      if (error && error.code !== "23505") break; // no internet or other problem: keep the rest
      if (error) duplicates++;
      else saved++;
      queue = queue.filter((q) => q !== item);
      writeQueue(queue);
    }
    setPending(readQueue());
    syncing.current = false;
    if (saved || duplicates) {
      setNotice(
        `Uploaded ${saved} registration(s).` +
          (duplicates ? ` Skipped ${duplicates} duplicate ID(s) already in the system.` : "")
      );
    }
    await load();
  }, [load]);

  useEffect(() => {
    setOnline(navigator.onLine);
    setPending(readQueue());
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

  function clearForm() {
    setName("");
    setHousehold("");
    setLocation("");
    setRef("");
    setError("");
  }

  function saveOffline(record: Pending) {
    writeQueue([...readQueue(), record]);
    setPending(readQueue());
    setNotice("Saved on this device. It will upload automatically when the internet is back.");
    clearForm();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setNotice("");
    const record: Pending = { name, household: Number(household), location, ref };

    if (people.some((p) => p.ref === ref) || readQueue().some((q) => q.ref === ref)) {
      setError("This reference number is already registered.");
      return;
    }
    if (!navigator.onLine) {
      saveOffline(record);
      return;
    }
    const { error } = await supabase.from("beneficiaries").insert(record);
    if (error) {
      if (error.code === "23505") setError("This reference number is already registered.");
      else if (!error.code) saveOffline(record); // network failure
      else setError(error.message);
      return;
    }
    clearForm();
    await load();
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-3xl font-bold">Beneficiary Registration</h1>

      {!online && (
        <p className="mt-4 rounded bg-yellow-100 p-2 text-yellow-900">
          You are offline. New registrations are saved on this device and will upload automatically.
        </p>
      )}
      {notice && <p className="mt-4 text-green-700">{notice}</p>}

      <form onSubmit={submit} className="mt-6 grid gap-3">
        <input className="rounded border p-2" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="rounded border p-2" type="number" min="1" placeholder="Household size" value={household} onChange={(e) => setHousehold(e.target.value)} required />
        <input className="rounded border p-2" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} required />
        <input className="rounded border p-2" placeholder="ID or reference number" value={ref} onChange={(e) => setRef(e.target.value)} required />
        {error && <p className="text-red-600">{error}</p>}
        <button className="rounded bg-black p-2 text-white">Register</button>
      </form>

      {pending.length > 0 && (
        <>
          <h2 className="mt-8 text-xl font-semibold">Waiting to upload ({pending.length})</h2>
          <button onClick={() => sync()} className="mt-2 underline">
            Upload now
          </button>
          <ul className="mt-2 grid gap-2">
            {pending.map((p) => (
              <li key={p.ref} className="rounded border border-yellow-400 bg-yellow-50 p-3">
                {p.name} · {p.location} · Household: {p.household} · Ref: {p.ref}
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="mt-8 text-xl font-semibold">Registered ({people.length})</h2>
      <ul className="mt-2 grid gap-2">
        {people.map((p) => (
          <li key={p.id} className="rounded border p-3">
            {p.name} · {p.location} · Household: {p.household} · Ref: {p.ref} · By: {p.recorded_by ?? "unknown"}
          </li>
        ))}
      </ul>
    </main>
  );
}