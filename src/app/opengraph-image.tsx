import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "CWM Energy — Understand Your Energy";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#09090b",
          padding: "64px",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Emerald glow */}
        <div
          style={{
            position: "absolute",
            top: -200,
            left: -200,
            width: 700,
            height: 700,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(52,211,153,0.12) 0%, transparent 70%)",
          }}
        />

        {/* Mountain silhouette at bottom */}
        <svg
          style={{ position: "absolute", bottom: 0, left: 0, width: "100%", opacity: 0.15 }}
          viewBox="0 0 1200 300"
          preserveAspectRatio="none"
        >
          <path
            d="M0,300 L0,220 L120,100 L220,180 L340,60 L460,160 L560,80 L660,150 L780,40 L900,140 L1020,70 L1120,160 L1200,110 L1200,300 Z"
            fill="#34d399"
          />
        </svg>

        {/* Top: wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {/* Mountain mark */}
          <svg width="36" height="36" viewBox="0 0 32 32">
            <rect width="32" height="32" fill="#34d399" />
            <path d="M1 29 L10 7 L16.5 18 L23 7 L31 29 Z" fill="#09090b" />
          </svg>
          <span style={{ color: "#a1a1aa", fontSize: 18, letterSpacing: "0.15em" }}>
            CWM ENERGY
          </span>
          <span
            style={{
              color: "#34d399",
              fontSize: 11,
              letterSpacing: "0.2em",
              border: "1px solid rgba(52,211,153,0.3)",
              padding: "3px 10px",
              marginLeft: 8,
            }}
          >
            OPEN SOURCE · CANADA
          </span>
        </div>

        {/* Main headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div
            style={{
              color: "#f4f4f5",
              fontSize: 80,
              fontWeight: 900,
              lineHeight: 0.95,
              letterSpacing: "-0.03em",
            }}
          >
            Understand
          </div>
          <div
            style={{
              color: "#34d399",
              fontSize: 80,
              fontWeight: 900,
              lineHeight: 0.95,
              letterSpacing: "-0.03em",
            }}
          >
            Your Energy.
          </div>
        </div>

        {/* Bottom: tagline + URL */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div
            style={{
              color: "#71717a",
              fontSize: 22,
              maxWidth: 700,
              lineHeight: 1.4,
            }}
          >
            Science-based carbon tools for Canadians. Free, no account needed.
          </div>
          <div
            style={{
              color: "#3f3f46",
              fontSize: 18,
              letterSpacing: "0.1em",
              fontFamily: "monospace",
            }}
          >
            cwmenergy.ca
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
