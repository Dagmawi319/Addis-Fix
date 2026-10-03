import React from "react";
import { Users, Brain, Activity, MapPin } from "lucide-react";
import { MarketingNav, MarketingFooter } from "@/components/layout/Marketing";

const ABOUT_IMG = "https://images.unsplash.com/photo-1584972191378-d70853fc47fc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxNzV8MHwxfHNlYXJjaHwxfHxjaXR5JTIwbWFwJTIwbG9jYXRpb24lMjBwaW4lMjBuYXZpZ2F0aW9ufGVufDB8fHx8MTc5MTAzNTUzM3ww&ixlib=rb-4.1.0&q=85";

export default function About() {
  return (
    <div className="app-dark">
      <MarketingNav />
      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">About AddisFix</h1>
            <p className="mt-4 text-slate-300">Turning everyday observations into real change.</p>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              AddisFix is a community-powered platform that helps residents report problems in their
              neighborhoods and enables authorized staff to track and resolve them. By combining people,
              location data, photos and assistive AI, we turn individual reports into verified, trackable
              incidents that make Addis better for everyone.
            </p>
            <p className="mt-4 rounded-lg border border-[#1E2C4A] bg-[#111A2E] p-4 text-xs text-slate-400">
              AddisFix is an independent civic-tech prototype. It is <strong className="text-slate-200">not</strong> officially
              integrated with the Addis Ababa city government. The authority workflow demonstrates how staff
              could review and resolve issues in a future institutional integration.
            </p>
          </div>
          <img src={ABOUT_IMG} alt="City map" className="h-72 w-full rounded-2xl object-cover md:h-96" />
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Users, t: "Community", d: "Residents report and support incidents." },
            { icon: Brain, t: "Technology", d: "AI assists in classifying and grouping similar reports." },
            { icon: Activity, t: "Transparency", d: "Track progress from report to resolution." },
            { icon: MapPin, t: "Better Addis", d: "Cleaner, safer and more livable neighbourhoods." },
          ].map((c) => (
            <div key={c.t} className="card-dark p-5">
              <c.icon className="h-6 w-6 text-[#19C3C9]" />
              <h3 className="mt-3 font-display font-semibold text-white">{c.t}</h3>
              <p className="mt-1 text-sm text-slate-400">{c.d}</p>
            </div>
          ))}
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
