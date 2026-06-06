import DiagramFrame from './DiagramFrame'

// Whole-house cross-section labelling the parts of the building envelope the
// calculator estimates heat loss through. Emerald arrows mark where heat escapes.
const EM = '#059669'

export default function HouseEnvelopeDiagram({ caption }) {
  return (
    <DiagramFrame caption={caption}>
      <svg viewBox="0 0 360 300" className="w-full h-auto" role="img"
        aria-label="Cross-section of a two-storey house labelling the attic, walls, windows, rim joist and basement walls">

        {/* ── roof + attic ── */}
        <polygon points="170,18 268,92 72,92" fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeOpacity="0.55" />
        <text x="170" y="74" textAnchor="middle" fill="currentColor" fillOpacity="0.7" fontSize="10">attic</text>

        {/* ceiling line (attic insulation) */}
        <line x1="92" y1="92" x2="248" y2="92" stroke="currentColor" strokeOpacity="0.7" strokeWidth="2.5" />

        {/* ── above-grade walls (two storeys) ── */}
        <rect x="92" y="92" width="156" height="118" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeOpacity="0.6" />
        {/* storey divider */}
        <line x1="92" y1="151" x2="248" y2="151" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" />
        {/* windows */}
        <rect x="112" y="108" width="28" height="26" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.6" />
        <rect x="200" y="166" width="28" height="26" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.6" />

        {/* ── grade line ── */}
        <line x1="20" y1="210" x2="92" y2="210" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="248" y1="210" x2="340" y2="210" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="3 3" />

        {/* ── rim joist band (at grade) ── */}
        <rect x="92" y="204" width="156" height="10" fill={EM} fillOpacity="0.7" stroke={EM} strokeWidth="1" />

        {/* ── basement (below grade) ── */}
        <rect x="92" y="214" width="156" height="64" fill="currentColor" fillOpacity="0.04" stroke="currentColor" strokeOpacity="0.5" />
        <g stroke="currentColor" strokeOpacity="0.16" strokeWidth="0.75">
          <line x1="92" y1="240" x2="248" y2="240" />
          <line x1="92" y1="260" x2="248" y2="260" />
        </g>

        {/* ── heat-loss arrows (emerald) ── */}
        <g stroke={EM} strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M170 60 l0 -16 M166 50 l4 -6 l4 6" />
          <path d="M120 121 l16 0 M130 117 l6 4 l-6 4" />
          <path d="M214 179 l16 0 M224 175 l6 4 l-6 4" />
        </g>

        {/* ── labels ── */}
        <g fontSize="10" fontFamily="sans-serif">
          {/* ceiling / attic */}
          <text x="276" y="64" fill="currentColor" fillOpacity="0.85">Ceiling /</text>
          <text x="276" y="76" fill="currentColor" fillOpacity="0.85">attic</text>
          <line x1="248" y1="86" x2="272" y2="70" stroke="currentColor" strokeOpacity="0.4" strokeWidth="0.75" />

          {/* walls */}
          <text x="276" y="128" fill="currentColor" fillOpacity="0.85">Walls</text>
          <line x1="248" y1="124" x2="272" y2="124" stroke="currentColor" strokeOpacity="0.4" strokeWidth="0.75" />

          {/* windows */}
          <text x="276" y="180" fill="currentColor" fillOpacity="0.85">Windows</text>
          <line x1="228" y1="179" x2="272" y2="177" stroke="currentColor" strokeOpacity="0.4" strokeWidth="0.75" />

          {/* rim joist */}
          <text x="276" y="210" fill={EM} fontWeight="bold">Rim joist</text>
          <line x1="248" y1="209" x2="272" y2="207" stroke={EM} strokeOpacity="0.7" strokeWidth="0.75" />

          {/* basement walls */}
          <text x="276" y="250" fill="currentColor" fillOpacity="0.85">Basement</text>
          <text x="276" y="262" fill="currentColor" fillOpacity="0.85">walls</text>
          <line x1="248" y1="248" x2="272" y2="250" stroke="currentColor" strokeOpacity="0.4" strokeWidth="0.75" />

          {/* air leakage legend */}
          <g transform="translate(20,250)">
            <path d="M0 6 l14 0 M8 2 l6 4 l-6 4" stroke={EM} strokeWidth="2" fill="none" strokeLinecap="round" />
            <text x="20" y="9" fill={EM} fontSize="9">heat escaping</text>
          </g>
        </g>
      </svg>
    </DiagramFrame>
  )
}
