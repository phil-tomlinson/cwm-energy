import DiagramFrame from './DiagramFrame'

// Cross-section of where the first floor meets the foundation, highlighting the
// rim (band) joist — the board that closes off the ends of the floor joists
// around the perimeter. It's usually uninsulated and a major air-leakage path.
const EM = '#059669'   // emerald-600 — reads on both light and dark backgrounds

export default function RimJoistDiagram({ caption }) {
  return (
    <DiagramFrame caption={caption}>
      <svg viewBox="0 0 360 232" className="w-full h-auto" role="img"
        aria-label="Cross-section of a house wall meeting the foundation, with the rim joist highlighted">

        {/* grade line (outside ground) */}
        <line x1="0" y1="160" x2="58" y2="160" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="3 3" />
        <text x="4" y="172" fill="currentColor" fillOpacity="0.5" fontSize="9" fontFamily="monospace">outside</text>

        {/* ── above-grade exterior wall ── */}
        <rect x="60" y="20" width="44" height="78" fill="currentColor" fillOpacity="0.10" stroke="currentColor" strokeOpacity="0.55" />
        <line x1="82" y1="24" x2="82" y2="94" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
        <text x="118" y="46" fill="currentColor" fillOpacity="0.85" fontSize="10">Exterior wall</text>
        <line x1="104" y1="52" x2="114" y2="46" stroke="currentColor" strokeOpacity="0.4" strokeWidth="0.75" />

        {/* ── subfloor ── */}
        <rect x="60" y="98" width="232" height="9" fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeOpacity="0.5" />
        <text x="300" y="105" fill="currentColor" fillOpacity="0.85" fontSize="10">Subfloor</text>
        <line x1="292" y1="103" x2="298" y2="103" stroke="currentColor" strokeOpacity="0.4" strokeWidth="0.75" />

        {/* ── floor joist (runs inward) ── */}
        <rect x="80" y="116" width="212" height="30" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.45" />
        <text x="300" y="134" fill="currentColor" fillOpacity="0.85" fontSize="10">Floor</text>
        <text x="300" y="146" fill="currentColor" fillOpacity="0.85" fontSize="10">joists</text>
        <line x1="292" y1="131" x2="298" y2="135" stroke="currentColor" strokeOpacity="0.4" strokeWidth="0.75" />

        {/* ── rim / band joist (HIGHLIGHT) ── */}
        <rect x="60" y="107" width="20" height="48" fill={EM} fillOpacity="0.85" stroke={EM} strokeWidth="1.5" />
        {/* left callout */}
        <line x1="60" y1="128" x2="40" y2="120" stroke={EM} strokeWidth="1" />
        <circle cx="60" cy="128" r="2.5" fill={EM} />
        <text x="6" y="112" fill={EM} fontSize="11" fontWeight="bold">Rim joist</text>

        {/* ── sill plate ── */}
        <rect x="58" y="155" width="48" height="9" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeOpacity="0.5" />
        <text x="118" y="163" fill="currentColor" fillOpacity="0.85" fontSize="10">Sill plate</text>
        <line x1="106" y1="160" x2="114" y2="160" stroke="currentColor" strokeOpacity="0.4" strokeWidth="0.75" />

        {/* ── foundation / basement wall ── */}
        <rect x="60" y="164" width="44" height="60" fill="currentColor" fillOpacity="0.07" stroke="currentColor" strokeOpacity="0.5" />
        <g stroke="currentColor" strokeOpacity="0.18" strokeWidth="0.75">
          <line x1="60" y1="190" x2="104" y2="190" />
          <line x1="60" y1="208" x2="104" y2="208" />
        </g>
        <text x="118" y="194" fill="currentColor" fillOpacity="0.85" fontSize="10">Foundation /</text>
        <text x="118" y="206" fill="currentColor" fillOpacity="0.85" fontSize="10">basement wall</text>
        <line x1="104" y1="196" x2="114" y2="198" stroke="currentColor" strokeOpacity="0.4" strokeWidth="0.75" />
      </svg>
    </DiagramFrame>
  )
}
