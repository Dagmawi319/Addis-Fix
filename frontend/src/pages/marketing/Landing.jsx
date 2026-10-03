import React from "react";
import { Link } from "react-router-dom";
import { Camera, Brain, Users, CheckCircle2, MapPin, ArrowRight, ShieldCheck, Bell, Activity } from "lucide-react";
import { MarketingNav, MarketingFooter } from "@/components/layout/Marketing";

const HERO_IMG = "https://images.unsplash.com/photo-1668003314070-9ef38c3cafb8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzB8MHwxfHNlYXJjaHwyfHxBZGRpcyUyMEFiYWJhJTIwY2l0eSUyMHNreWxpbmUlMjBzdW5zZXQlMjBkdXNrfGVufDB8fHx8MTc5MTAzNTUzM3ww&ixlib=rb-4.1.0&q=85";

const FEATURES = [
  { icon: Camera, title: "Report", desc: "Take a photo and add location & details in seconds." },
  { icon: Brain, title: "We Analyze", desc: "Assistive AI suggests category, severity and duplicates." },
  { icon: Users, title: "Community", desc: "More confirmations mean higher priority." },
  { icon: CheckCircle2, title: "Get It Fixed", desc: "Track progress until it's verified and resolved." },
];

const STEPS = [
  { n: "01", t: "Report a problem", d: "Snap a photo, drop a pin, describe the issue." },
  { n: "02", t: "AI assists", d: "Server-side AI suggests a category and flags possible duplicates." },
  { n: "03", t: "Community confirms", d: "Neighbours tap 'I see this too' to raise priority." },
  { n: "04", t: "Authority reviews", d: "Staff verify, assign a department and update status." },
  { n: "05", t: "Resolved & notified", d: "Followers get an in-app notification when it's fixed." },
];

export default function Landing() {
  return (
    <div className="app-dark">
      <MarketingNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <img src={HERO_IMG} alt="Addis Ababa skyline at dusk" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(11,18,32,0.95) 0%, rgba(11,18,32,0.75) 55%, rgba(11,18,32,0.4) 100%)" }} />
        <div className="relative mx-auto max-w-7xl px-5 py-24 sm:py-32">
          <div className="max-w-2xl animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#19C3C9]/30 bg-[#19C3C9]/10 px-3 py-1 text-xs font-semibold text-[#19C3C9]">
              <MapPin className="h-3.5 w-3.5" /> Report · Track · Improve
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              A Cleaner, Safer,<br /><span className="text-[#19C3C9]">Better Addis</span> — Together.
            </h1>
            <p className="mt-5 max-w-xl text-base text-slate-300 sm:text-lg">
              Report problems in your neighborhood. Help your community. Get things fixed.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/report" data-testid="hero-report-btn" className="btn-teal inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-bold">
                Report a Problem <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/map" data-testid="hero-map-btn" className="inline-flex items-center gap-2 rounded-lg border border-[#19C3C9] px-6 py-3 text-sm font-semibold text-[#19C3C9] hover:bg-[#19C3C9]/10 transition-colors">
                View Map
              </Link>
            </div>
          </div>
        </div>

        {/* Feature strip */}
        <div className="relative border-t border-[#1E2C4A] bg-[#0B1220]/80">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-5 py-8 sm:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="px-4 py-2">
                <f.icon className="h-6 w-6 text-[#19C3C9]" />
                <h3 className="mt-3 font-display text-sm font-bold text-white">{f.title}</h3>
                <p className="mt-1 text-xs text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-7xl px-5 py-20">
        <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">How AddisFix works</h2>
        <p className="mt-2 max-w-xl text-sm text-slate-400">From a single citizen report to a tracked, resolved incident — one connected workflow.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((s) => (
            <div key={s.n} className="card-dark p-5">
              <span className="font-mono text-sm text-[#19C3C9]">{s.n}</span>
              <h3 className="mt-2 font-display text-base font-semibold text-white">{s.t}</h3>
              <p className="mt-1 text-xs text-slate-400">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="border-t border-[#1E2C4A] bg-[#080E1A]">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-16 md:grid-cols-3">
          {[
            { icon: ShieldCheck, t: "Privacy by design", d: "Your identity and contact details are never shown on public incident pages." },
            { icon: Activity, t: "Report vs. Incident", d: "Many reports about the same problem are grouped into one trackable incident." },
            { icon: Bell, t: "Stay informed", d: "Follow incidents and receive in-app notifications as their status changes." },
          ].map((c) => (
            <div key={c.t} className="flex gap-3">
              <c.icon className="h-6 w-6 shrink-0 text-[#19C3C9]" />
              <div>
                <h3 className="font-display text-base font-semibold text-white">{c.t}</h3>
                <p className="mt-1 text-sm text-slate-400">{c.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 text-center">
        <h2 className="font-display text-3xl font-bold text-white">Ready to improve your neighbourhood?</h2>
        <p className="mt-2 text-slate-400">Join AddisFix and report your first issue in under a minute.</p>
        <Link to="/register" data-testid="cta-register-btn" className="btn-teal mt-6 inline-flex items-center gap-2 rounded-lg px-7 py-3 text-sm font-bold">
          Get Started <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <MarketingFooter />
    </div>
  );
}
