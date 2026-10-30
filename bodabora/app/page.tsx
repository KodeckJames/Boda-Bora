import Link from "next/link";
import { Button, Logo, ScoreBar, ScoreGauge } from "@/components/ui";
import { coachingMessage, currentRider, subScoreLabels } from "@/lib/mock-data";

const pillars = [
  {
    title: "Phone-only telematics",
    body: "GPS, accelerometer and gyroscope fusion detects harsh braking, cornering and acceleration from a phone loose in a pocket. No hardware to install.",
  },
  {
    title: "Coverage you can't game",
    body: "Scores are weighted by how much of a rider's shift was actually logged, cross-checked against SACCO shift records. Selective logging lowers confidence, not risk.",
  },
  {
    title: "Coaching in Kiswahili",
    body: "AI turns each week's trace into specific advice: the exact roundabout, the exact hour where risk concentrates. Not generic safety posters.",
  },
  {
    title: "Works on any phone",
    body: "Dial a USSD code to check your score when your smartphone is dead, borrowed or sold. The score belongs to the rider.",
  },
];

const steps = [
  { n: "01", title: "Ride", body: "The app samples sensors on a duty cycle and batches uploads over night-time WiFi to protect battery and data." },
  { n: "02", title: "Score", body: "Events, night-hours exposure and blackspot-weighted route risk combine into a single 0–100 Rider Safety Score." },
  { n: "03", title: "Verify", body: "A confidence layer compares trace coverage against shift records, flagging sparse or selective logging." },
  { n: "04", title: "Price", body: "Insurers price careful riders correctly; SACCOs see fleet risk and coach the riders they're liable for." },
];

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-ink text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <header className="flex h-16 items-center justify-between">
            <Logo dark />
            <nav className="hidden gap-6 text-sm text-white/70 sm:flex">
              <Link href="/rider" className="hover:text-white">Riders</Link>
              <Link href="/sacco" className="hover:text-white">SACCOs</Link>
              <Link href="/insurer" className="hover:text-white">Insurers</Link>
              <Link href="/ussd" className="hover:text-white">USSD</Link>
            </nav>
          </header>

          <div className="grid items-center gap-12 py-16 lg:grid-cols-[1.2fr_1fr] lg:py-24">
            <div>
              <p className="mb-4 inline-flex rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-white/70">
                AI in Transport &amp; Mobility
              </p>
              <h1 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
                Insurance priced on how you <span className="text-hivis">actually ride.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-white/70">
                Kenya&apos;s insurers price every boda rider as reckless, so careful riders go uninsured.
                Boda Bora measures real riding behaviour from the phone in their pocket and turns it
                into a score insurers can trust.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button href="/rider" variant="hivis">See the rider app</Button>
                <Link
                  href="/rider/live"
                  className="inline-flex h-10 items-center rounded-full border border-white/20 px-5 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Live sensor demo
                </Link>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 text-foreground shadow-2xl">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold">{currentRider.name}</span>
                <span className="text-muted">{currentRider.stage}</span>
              </div>
              <div className="flex justify-center py-2">
                <ScoreGauge score={currentRider.score} />
              </div>
              <div className="mt-4 space-y-3">
                {(["braking", "cornering", "nightExposure"] as const).map((k) => (
                  <ScoreBar key={k} label={subScoreLabels[k].en} value={currentRider.subScores[k]} />
                ))}
              </div>
              <div className="mt-5 rounded-xl bg-hivis/15 p-3 text-sm">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#8a6400]">Ushauri wa wiki</p>
                <p className="line-clamp-3">{coachingMessage.sw}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:grid-cols-3 sm:px-6">
          <div>
            <p className="tabular text-4xl font-bold tracking-tight">5,000+</p>
            <p className="mt-2 text-muted">road deaths in Kenya every year, with bodas a disproportionate share.</p>
          </div>
          <div>
            <p className="text-4xl font-bold tracking-tight">One price</p>
            <p className="mt-2 text-muted">for every rider. Careful riders subsidise reckless ones, so they opt out.</p>
          </div>
          <div>
            <p className="text-4xl font-bold tracking-tight">Uninsured</p>
            <p className="mt-2 text-muted">riders, passengers and county hospitals absorb the cost when crashes happen.</p>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="max-w-2xl text-3xl font-bold tracking-tight">
          An information problem wearing an insurance problem&apos;s clothes.
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {pillars.map((p) => (
            <div key={p.title} className="rounded-2xl border border-line bg-surface p-6">
              <h3 className="font-semibold">{p.title}</h3>
              <p className="mt-2 text-muted">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.n} className="border-t-2 border-hivis pt-4">
                <span className="font-mono text-sm text-muted">{s.n}</span>
                <h3 className="mt-1 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Buyers */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <Link href="/sacco" className="group rounded-3xl bg-ink p-8 text-white">
            <p className="text-xs font-semibold uppercase tracking-wider text-hivis">For SACCOs</p>
            <h3 className="mt-3 text-2xl font-bold">Fleet safety you can act on</h3>
            <p className="mt-3 text-white/70">
              Monitor every rider you&apos;re liable for, spot coverage gaps against shift records, and
              send targeted coaching before the next crash.
            </p>
            <span className="mt-6 inline-block text-sm font-semibold text-hivis group-hover:underline">Open fleet dashboard →</span>
          </Link>
          <Link href="/insurer" className="group rounded-3xl bg-hivis p-8 text-ink">
            <p className="text-xs font-semibold uppercase tracking-wider">For insurers</p>
            <h3 className="mt-3 text-2xl font-bold">A real risk signal, finally</h3>
            <p className="mt-3 text-ink/70">
              Confidence-weighted scores let you price careful riders correctly for the first time and
              grow a market that&apos;s been collapsing toward the riskiest riders.
            </p>
            <span className="mt-6 inline-block text-sm font-semibold group-hover:underline">Open underwriting portal →</span>
          </Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted sm:flex-row sm:justify-between sm:px-6">
          <span>Boda Bora · Built on real riding traces from Thika Road</span>
          <span>Theme 10 · AI in Transport &amp; Mobility</span>
        </div>
      </footer>
    </div>
  );
}
