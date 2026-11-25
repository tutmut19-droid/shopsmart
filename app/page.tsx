import Link from "next/link";

const features = [
  { title: "Register once", text: "Each person gets one record. The database blocks a repeated ID number." },
  { title: "Record every distribution", text: "Search a name or ID, tap Received, and the date and staff member are saved." },
  { title: "Stop double aid", text: "A warning appears if the same person got the same item in the last 30 days." },
  { title: "Works offline", text: "No signal? Entries are saved on the phone and upload by themselves later." },
  { title: "Donor-ready reports", text: "Live totals by item and location, with a one-click CSV export." },
  { title: "Secure by design", text: "Staff-only login, a locked database and an audit trail on every record." },
];

const steps = [
  { title: "Log in", text: "Staff sign in with an account created by an administrator." },
  { title: "Register and record", text: "Add people, then tap Received on distribution day, online or offline." },
  { title: "Report", text: "Open the dashboard for live totals and export a CSV for donors." },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <section className="text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-green-800/30 bg-white px-3 py-1 text-sm text-green-900">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-600" />
          Works offline · Installable on your phone
        </p>
        <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-green-900 sm:text-6xl">
          MsaadaTrack
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-700 sm:text-xl">
          Secure aid registration and distribution tracking for NGOs. Every person counted.
          Every distribution recorded.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="rounded-lg bg-green-800 px-6 py-3 font-semibold text-white shadow transition hover:bg-green-900 active:scale-95"
          >
            Staff login
          </Link>
          <a
            href="#how"
            className="rounded-lg border border-green-800 bg-white px-6 py-3 font-semibold text-green-900 transition hover:bg-green-50 active:scale-95"
          >
            How it works
          </a>
        </div>
      </section>

      <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-green-900/10 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <h2 className="font-bold text-green-900">{f.title}</h2>
            <p className="mt-2 text-sm text-gray-700">{f.text}</p>
          </div>
        ))}
      </section>

      <section id="how" className="mt-16">
        <h2 className="text-center text-2xl font-bold text-green-900">How it works</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="rounded-xl bg-white p-5 shadow-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-800 font-bold text-white">
                {i + 1}
              </span>
              <h3 className="mt-3 font-bold text-green-900">{s.title}</h3>
              <p className="mt-1 text-sm text-gray-700">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-16 text-center text-sm text-gray-500">
        Staff-only app. The demo uses fake data only.
      </p>
    </main>
  );
}