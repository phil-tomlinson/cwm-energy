import DiagramFrame from './DiagramFrame'

// ── Parametric house cutaway ───────────────────────────────────────────────
// Redraws from the wizard inputs so the picture matches the answers as they're
// entered: storeys set the height, house type sets width + which sides are shared
// party walls (no heat loss there), and basement type sets what's below grade.
// Heat-loss arrows leave each EXPOSED surface — walls off the sides, windows off
// the glazing, ceiling up, basement out below grade — and can be weighted by the
// computed heat-loss breakdown on the results page.

const EM = '#059669'

// geometry constants
const VB_W = 420, VB_H = 340
const GRADE = 250
const CENTER = 200
const STOREY_H = 50

const HOUSE_WIDTH = { detached: 150, semi: 140, townhouse: 150, apartment: 132 }

// which sides lose heat for each house type
const EXPOSURE = {
  detached:  { left: true,  right: true,  roof: true  },
  semi:      { left: true,  right: false, roof: true  },   // right is a party wall
  townhouse: { left: false, right: false, roof: true  },   // both sides shared
  apartment: { left: false, right: false, roof: false },   // mid-block unit; front only
}

const HAS_BASEMENT = new Set(['full_heated', 'full_unheated', 'partial'])

// Arrow stroke width from a 0–1 share (used when a heat-loss breakdown is supplied).
function weight(share) {
  if (share == null) return 2.4
  if (share < 0.04) return 0
  return 1.6 + Math.min(share, 0.5) * 6
}

// A short outward-pointing arrow: (x,y) tail, (dx,dy) direction (unit-ish).
function Arrow({ x, y, dx, dy, w }) {
  if (!w) return null
  const len = 17
  const ex = x + dx * len, ey = y + dy * len
  // arrowhead
  const ax = -dx, ay = -dy
  const px = -dy, py = dx
  const h = 5
  return (
    <g stroke={EM} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <line x1={x} y1={y} x2={ex} y2={ey} />
      <path d={`M ${ex + ax * h + px * h} ${ey + ay * h + py * h} L ${ex} ${ey} L ${ex + ax * h - px * h} ${ey + ay * h - py * h}`} />
    </g>
  )
}

export default function HouseDiagram({
  houseType = 'detached',
  storeys = 2,
  basementType = 'full_heated',
  components = null,        // optional heatLoss.components → weights the arrows
  showLabels = true,
  caption,
  className = '',
}) {
  const exp = EXPOSURE[houseType] ?? EXPOSURE.detached
  const bodyW = HOUSE_WIDTH[houseType] ?? 150
  const left  = CENTER - bodyW / 2
  const right = CENTER + bodyW / 2

  const full = Math.floor(storeys)
  const half = storeys - full >= 0.5
  const bodyH = full * STOREY_H + (half ? STOREY_H * 0.5 : 0)
  const top   = GRADE - bodyH

  const flatRoof = houseType === 'apartment'
  const roofH = flatRoof ? 14 : 46
  const roofPeak = top - roofH
  const overhang = flatRoof ? 6 : 12

  const hasBasement = HAS_BASEMENT.has(basementType)
  const crawl = basementType === 'crawlspace'
  const slab  = basementType === 'slab'
  const belowDepth = hasBasement ? 58 : crawl ? 24 : 0

  // Tighten the frame to the drawing so short homes don't float in empty space.
  const contentTop = houseType === 'apartment' ? top - 22 : roofPeak
  const minY = contentTop - 22
  const maxY = GRADE + belowDepth + 16

  // heat-loss shares
  const total = components ? Object.values(components).reduce((s, v) => s + (v > 0 ? v : 0), 0) : 0
  const share = (keys) => {
    if (!components || total <= 0) return null
    return keys.reduce((s, k) => s + (components[k] > 0 ? components[k] : 0), 0) / total
  }
  const wRoof  = exp.roof ? weight(share(['ceiling'])) : 0
  const wWall  = weight(share(['walls']))
  const wWin   = weight(share(['windows', 'doors']))
  const wBase  = hasBasement ? weight(share(['basementWalls', 'basementFloor'])) : 0
  const wRim   = weight(share(['airLeakage']))

  // windows: up to 2 per full storey on the facade
  const windows = []
  const winW = 16, winH = 18
  for (let s = 0; s < full; s++) {
    const cy = GRADE - s * STOREY_H - STOREY_H / 2 - winH / 2
    windows.push({ x: CENTER - 34, y: cy }, { x: CENTER + 18, y: cy })
  }

  return (
    <DiagramFrame caption={caption} className={className}>
      <svg viewBox={`0 ${minY} ${VB_W} ${maxY - minY}`} className="w-full h-auto" role="img"
        aria-label={`Cutaway of a ${storeys}-storey ${houseType} home`}>

        {/* grade line */}
        <line x1="12" y1={GRADE} x2={VB_W - 12} y2={GRADE} stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 3" />

        {/* neighbour stubs on shared (party-wall) sides */}
        {!exp.left && houseType !== 'apartment' && (
          <rect x={left - 30} y={top + 14} width="30" height={bodyH - 14} fill="currentColor" fillOpacity="0.04" stroke="currentColor" strokeOpacity="0.25" strokeDasharray="2 2" />
        )}
        {!exp.right && houseType !== 'apartment' && (
          <rect x={right} y={top + 14} width="30" height={bodyH - 14} fill="currentColor" fillOpacity="0.04" stroke="currentColor" strokeOpacity="0.25" strokeDasharray="2 2" />
        )}
        {/* apartment: faded neighbour units around the unit */}
        {houseType === 'apartment' && (
          <g fill="currentColor" fillOpacity="0.04" stroke="currentColor" strokeOpacity="0.22" strokeDasharray="2 2">
            <rect x={left - 26} y={top} width="26" height={bodyH} />
            <rect x={right} y={top} width="26" height={bodyH} />
            <rect x={left} y={top - 22} width={bodyW} height="22" />
          </g>
        )}

        {/* ── roof / attic ── */}
        {flatRoof ? (
          <rect x={left - overhang} y={roofPeak} width={bodyW + overhang * 2} height={roofH} fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.55" />
        ) : (
          <polygon points={`${CENTER},${roofPeak} ${right + overhang},${top} ${left - overhang},${top}`} fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeOpacity="0.55" />
        )}
        {!flatRoof && bodyH >= STOREY_H && (
          <text x={CENTER} y={top - 10} textAnchor="middle" fill="currentColor" fillOpacity="0.6" fontSize="9">attic</text>
        )}

        {/* ── house body ── */}
        <rect x={left} y={top} width={bodyW} height={bodyH} fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeOpacity="0.6" />
        {/* storey dividers */}
        {Array.from({ length: full }, (_, i) => i + 1).slice(0, -1).map(i => (
          <line key={i} x1={left} y1={GRADE - i * STOREY_H} x2={right} y2={GRADE - i * STOREY_H} stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" />
        ))}
        {/* ceiling line (attic floor) — thicker, it's the insulated boundary */}
        <line x1={left} y1={top} x2={right} y2={top} stroke="currentColor" strokeOpacity="0.7" strokeWidth="2.5" />

        {/* party-wall emphasis (shared sides drawn heavier, no loss) */}
        {!exp.left  && <line x1={left}  y1={top} x2={left}  y2={GRADE} stroke="currentColor" strokeOpacity="0.5" strokeWidth="3" />}
        {!exp.right && <line x1={right} y1={top} x2={right} y2={GRADE} stroke="currentColor" strokeOpacity="0.5" strokeWidth="3" />}

        {/* ── windows ── */}
        {windows.map((w, i) => (
          <rect key={i} x={w.x} y={w.y} width={winW} height={winH} fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.55" />
        ))}

        {/* ── rim joist band at grade ── */}
        {!slab && basementType !== 'none' && (
          <rect x={left} y={GRADE - 5} width={bodyW} height="6" fill={EM} fillOpacity="0.55" stroke={EM} strokeOpacity="0.7" strokeWidth="0.75" />
        )}

        {/* ── below grade ── */}
        {belowDepth > 0 && (
          <>
            <rect x={left} y={GRADE} width={bodyW} height={belowDepth} fill="currentColor" fillOpacity="0.04" stroke="currentColor" strokeOpacity="0.45" />
            <g stroke="currentColor" strokeOpacity="0.14" strokeWidth="0.75">
              <line x1={left} y1={GRADE + belowDepth * 0.5} x2={right} y2={GRADE + belowDepth * 0.5} />
            </g>
          </>
        )}
        {slab && <rect x={left} y={GRADE - 2} width={bodyW} height="6" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeOpacity="0.5" />}

        {/* ── heat-loss arrows (exposed surfaces only) ── */}
        {/* roof / ceiling — up */}
        <Arrow x={CENTER} y={flatRoof ? roofPeak : roofPeak + 14} dx={0} dy={-1} w={wRoof} />
        {/* walls — straight out the exposed sides */}
        {exp.left  && <Arrow x={left}  y={top + bodyH * 0.4} dx={-1} dy={0} w={wWall} />}
        {exp.right && <Arrow x={right} y={top + bodyH * 0.6} dx={1}  dy={0} w={wWall} />}
        {/* windows — diagonally out of one pane, to read distinct from the wall */}
        {windows[0] && <Arrow x={windows[0].x} y={windows[0].y + winH / 2} dx={-0.8} dy={0.6} w={wWin} />}
        {/* basement walls — out the sides below grade */}
        {hasBasement && exp.left  && <Arrow x={left}  y={GRADE + belowDepth * 0.5} dx={-1} dy={0} w={wBase} />}
        {hasBasement && exp.right && <Arrow x={right} y={GRADE + belowDepth * 0.5} dx={1}  dy={0} w={wBase} />}
        {hasBasement && !exp.left && !exp.right && <Arrow x={right} y={GRADE + belowDepth * 0.5} dx={1} dy={0} w={wBase} />}

        {/* ── labels ── */}
        {showLabels && (
          <g fontSize="10" fontFamily="sans-serif" fill="currentColor">
            <Label x={right + 40} y={top - 6} lx1={CENTER + 20} ly1={roofPeak + 12} lx2={right + 36} ly2={top - 10} text="Ceiling / attic" show={exp.roof} />
            <Label x={right + 40} y={top + bodyH * 0.6 - 4} lx1={right} ly1={top + bodyH * 0.6} lx2={right + 36} ly2={top + bodyH * 0.6 - 6} text="Walls" show={exp.left || exp.right} noLine={!exp.right} />
            <Label x={right + 40} y={top + bodyH * 0.72} lx1={CENTER + 18 + winW} ly1={GRADE - STOREY_H / 2 - 2} lx2={right + 36} ly2={top + bodyH * 0.72 - 3} text="Windows" />
            <Label x={right + 40} y={GRADE + 4} lx1={right} ly1={GRADE - 2} lx2={right + 36} ly2={GRADE + 1} text="Rim joist" em show={!slab && basementType !== 'none'} />
            <Label x={right + 40} y={GRADE + belowDepth * 0.5 + 4} lx1={right} ly1={GRADE + belowDepth * 0.5} lx2={right + 36} ly2={GRADE + belowDepth * 0.5 + 1} text="Basement walls" show={hasBasement} />
          </g>
        )}
      </svg>
    </DiagramFrame>
  )
}

function Label({ x, y, lx1, ly1, lx2, ly2, text, em, show = true, noLine = false }) {
  if (!show) return null
  return (
    <>
      {!noLine && <line x1={lx1} y1={ly1} x2={lx2} y2={ly2} stroke={em ? EM : 'currentColor'} strokeOpacity={em ? 0.7 : 0.4} strokeWidth="0.75" />}
      <text x={x} y={y} fill={em ? EM : 'currentColor'} fillOpacity={em ? 1 : 0.85} fontWeight={em ? 'bold' : 'normal'}>{text}</text>
    </>
  )
}
