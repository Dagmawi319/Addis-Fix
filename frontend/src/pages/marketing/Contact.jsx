import React, { useState } from "react";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { toast } from "sonner";
import { MarketingNav, MarketingFooter } from "@/components/layout/Marketing";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const submit = (e) => {
    e.preventDefault();
    // In-app only: no external email provider is connected for this contact form.
    toast.success("Thanks! Your message was captured.", {
      description: "Note: external email delivery is not connected in this prototype.",
    });
    setForm({ name: "", email: "", message: "" });
  };

  return (
    <div className="app-dark">
      <MarketingNav />
      <section className="mx-auto max-w-7xl px-5 py-16">
        <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">Get in Touch</h1>
        <p className="mt-2 text-slate-400">We're here to help.</p>
        <div className="mt-10 grid gap-10 md:grid-cols-2">
          <div className="space-y-5">
            {[
              { icon: Mail, t: "Email", v: "support@addisfix.demo" },
              { icon: Phone, t: "Phone", v: "+251 11 123 4567 (demo)" },
              { icon: MapPin, t: "Location", v: "Addis Ababa, Ethiopia" },
              { icon: Clock, t: "Hours", v: "Mon–Fri, 8:00 AM – 6:00 PM" },
            ].map((c) => (
              <div key={c.t} className="flex items-start gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#19C3C9]/10"><c.icon className="h-5 w-5 text-[#19C3C9]" /></span>
                <div>
                  <div className="font-display text-sm font-semibold text-white">{c.t}</div>
                  <div className="text-sm text-slate-400">{c.v}</div>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={submit} className="card-dark space-y-4 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Name</label>
                <input data-testid="contact-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-[#1E2C4A] bg-[#0B1220] px-3 py-2 text-sm text-slate-200 focus:border-[#19C3C9] focus:outline-none" placeholder="Your name" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Email</label>
                <input data-testid="contact-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-lg border border-[#1E2C4A] bg-[#0B1220] px-3 py-2 text-sm text-slate-200 focus:border-[#19C3C9] focus:outline-none" placeholder="you@example.com" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Message</label>
              <textarea data-testid="contact-message" required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full rounded-lg border border-[#1E2C4A] bg-[#0B1220] px-3 py-2 text-sm text-slate-200 focus:border-[#19C3C9] focus:outline-none" placeholder="How can we help?" />
            </div>
            <button data-testid="contact-submit" type="submit" className="btn-teal w-full rounded-lg py-2.5 text-sm font-bold">Send Message</button>
          </form>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
