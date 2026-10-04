import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "CWM Energy: every tonne you've already cut counts";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Share card in the CWM palette: crevasse blue, snow, and the stepped descent
// toward the valley floor. No photo, so it renders fast at the edge.
export default function OGImage() {
  const steps = [
    { x: 760, h: 420, c: "#84B6CE" },
    { x: 860, h: 340, c: "#84B6CE" },
    { x: 960, h: 260, c: "#F2B33D" },
    { x: 1060, h: 180, c: "#C7366F" },
  ];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#144969",
          padding: "64px",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {steps.map((s) => (
          <div
            key={s.x}
            style={{
              position: "absolute",
              left: s.x,
              bottom: -20,
              width: 100,
              height: s.h,
              borderRadius: 10,
              backgroundColor: s.c,
            }}
          />
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="44" height="44" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="6" fill="#F6F8F7" />
            <path d="M3 27 L11 8 L16.5 18 L22 8 L29 27 Z" fill="#144969" />
          </svg>
          <span style={{ color: "#FFFFFF", fontSize: 30, fontWeight: 800 }}>CWM Energy</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 640 }}>
          <div style={{ color: "#FFFFFF", fontSize: 72, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.02em" }}>
            Every tonne you&apos;ve already cut counts.
          </div>
          <div style={{ color: "#D5DDDC", fontSize: 26, lineHeight: 1.35, marginTop: 24 }}>
            A free, open-source carbon tracker for Canadians.
          </div>
        </div>
        <div style={{ color: "#D5DDDC", fontSize: 22 }}>cwmenergy.ca</div>
      </div>
    ),
    { ...size }
  );
}
