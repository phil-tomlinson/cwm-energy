"use client";
import { useState } from "react";

type Status = "idle" | "sending" | "success" | "error";

export default function ContactPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");

    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: "37ea7ff9-7615-44af-8684-6e08419cec91",
          name: form.name,
          email: form.email,
          subject: form.subject || "CWM Energy contact form",
          message: form.message,
        }),
      });

      const data = await res.json();
      setStatus(data.success ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }

  const inputClass =
    "w-full bg-zinc-800 border border-zinc-700 text-zinc-100 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent placeholder-zinc-600 transition-colors";
  const labelClass = "block text-xs uppercase tracking-widest text-zinc-500 font-mono mb-2";

  return (
    <div className="bg-zinc-950 min-h-screen px-4 sm:px-6 py-20">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 font-mono mb-3">Contact</p>
        <h1 className="text-4xl font-black tracking-tight text-zinc-100 mb-3">Get in touch.</h1>
        <p className="text-zinc-500 text-sm mb-10 leading-relaxed">
          Questions, feedback, or want to explore a partnership?
          <br />
          We&apos;d love to hear from you.
        </p>

        {status === "success" ? (
          <div className="border border-emerald-400/30 bg-emerald-400/5 p-8 text-center">
            <div className="text-3xl mb-3">✓</div>
            <p className="text-emerald-400 font-bold text-lg mb-1">Message sent.</p>
            <p className="text-zinc-500 text-sm">We&apos;ll get back to you at {form.email}.</p>
            <button
              onClick={() => { setStatus("idle"); setForm({ name: "", email: "", subject: "", message: "" }); }}
              className="mt-6 text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-300 font-mono border border-zinc-700 px-4 py-2 transition-colors"
            >
              Send another
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Phil Tomlinson"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Subject</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => update("subject", e.target.value)}
                placeholder="What's this about?"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Message</label>
              <textarea
                required
                rows={6}
                value={form.message}
                onChange={(e) => update("message", e.target.value)}
                placeholder="Tell us what's on your mind..."
                className={inputClass}
              />
            </div>

            {status === "error" && (
              <p className="text-red-400 text-xs font-mono">
                Something went wrong — try emailing us directly at{" "}
                <a href="mailto:info@cwmenergy.ca" className="underline">info@cwmenergy.ca</a>
              </p>
            )}

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-zinc-600 font-mono">
                Or: <a href="mailto:info@cwmenergy.ca" className="text-zinc-500 hover:text-zinc-300 transition-colors">info@cwmenergy.ca</a>
              </p>
              <button
                type="submit"
                disabled={status === "sending"}
                className="bg-emerald-400 text-zinc-950 px-8 py-3 text-sm font-black uppercase tracking-widest hover:bg-emerald-300 disabled:bg-zinc-700 disabled:text-zinc-500 transition-colors"
              >
                {status === "sending" ? "Sending..." : "Send →"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
