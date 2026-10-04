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
    "w-full bg-snowfield border border-hairline text-basalt px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-glacier focus:border-transparent placeholder-scree transition-colors";
  const labelClass = "block text-[15px] font-semibold text-basalt mb-1";

  return (
    <div className="min-h-screen px-4 sm:px-6 pt-14 pb-20">
      <div className="max-w-xl mx-auto">

        <h1 className="m-0 mb-3 text-[32px] font-extrabold leading-[34px] tracking-[-0.01em] text-basalt sm:text-[48px] sm:leading-[50px]">Get in touch.</h1>
        <p className="text-scree mb-10">
          Questions, feedback, or want to explore a partnership? We&apos;d love to hear from you.
        </p>

        {status === "success" ? (
          <div className="border border-glacier bg-glacier/5 p-8 text-center rounded-[10px]">
            <p className="text-glacier font-bold text-lg mb-1">Message sent.</p>
            <p className="text-scree text-sm">We&apos;ll get back to you at {form.email}.</p>
            <button
              onClick={() => { setStatus("idle"); setForm({ name: "", email: "", subject: "", message: "" }); }}
              className="mt-6 text-[13px] text-scree hover:text-basalt tabular-nums border border-hairline px-4 py-2 transition-colors"
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
              <p className="text-fireweed text-[13px] tabular-nums">
                Something went wrong — try emailing us directly at{" "}
                <a href="mailto:info@cwmenergy.ca" className="underline">info@cwmenergy.ca</a>
              </p>
            )}

            <div className="flex items-center justify-between pt-2">
              <p className="text-[13px] text-scree tabular-nums">
                Or: <a href="mailto:info@cwmenergy.ca" className="text-scree hover:text-basalt transition-colors">info@cwmenergy.ca</a>
              </p>
              <button
                type="submit"
                disabled={status === "sending"}
                className="bg-glacier text-on-glacier px-8 py-3 text-sm font-black hover:opacity-90 disabled:bg-hairline disabled:text-scree transition-colors rounded-full"
              >
                {status === "sending" ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
