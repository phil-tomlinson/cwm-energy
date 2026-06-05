"use client";
import { useA11y } from "./A11yProvider";

export default function A11yToggle() {
  const { a11y, toggle } = useA11y();

  return (
    <button
      role="switch"
      aria-checked={a11y}
      aria-label="Accessibility mode"
      title={a11y ? "Turn off accessibility mode" : "Turn on accessibility mode"}
      onClick={toggle}
      className="flex items-center gap-1.5 text-xs uppercase tracking-widest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 rounded px-2 py-1 transition-colors"
      style={a11y ? { background: "#ffff00", color: "#000000" } : undefined}
    >
      {/* Eye icon — decorative, hidden from assistive technology */}
      <svg
        aria-hidden="true"
        focusable="false"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
        {a11y && <line x1="4" y1="4" x2="20" y2="20" />}
      </svg>
      <span>{a11y ? "A11y On" : "A11y"}</span>
    </button>
  );
}
