import DiagramFrame from './DiagramFrame'

// ── Parametric house cutaway ───────────────────────────────────────────────
// Redraws from the wizard inputs (storeys → height, house type → width + which
// sides are exposed party walls, basement type → what's below grade).
//
// Two display modes:
//  • Results: pass `components` (heatLoss breakdown) to weight the loss arrows.
//  • Companion: pass `highlight` (a trait key) to spotlight one part — it goes
//    bright emerald while every other part fades to context. Used by the
//    per-question companion panel.

const EM = '#059669'   // emerald-600, reads on light + dark
const EMB = '#10b981'  // brighter emerald for the highlighted part

const VB_W = 420
const GRADE = 250
const CENTER = 200
const STOREY_H = 50
const HOUSE_WIDTH = { detached: 150, semi: 140, townhouse: 150, apartment: 132 }
const EXPOSURE = {
  detached:  { left: true,  right: true,  roof: true  },
  semi:      { left: true,  right: false, roof: true  },
  townhouse: { left: false, right: false, roof: true  },
  apartment: { left: false, right: false, roof: false },
}
const HAS_BASEMENT = new Set(['full_heated', 'full_unheated', 'partial'])

function weight(share) {
  if (share == null) return 2.4
  if (share < 0.04) return 0
  return 1.6 + Math.min(share, 0.5) * 6
}

function Arrow({ x, y, dx, dy, w, op = 1, color = EM }) {
  if (!w) return null
  const len = 17
  const ex = x + dx * len, ey = y + dy * len
  const ax = -dx, ay = -dy, px = -dy, py = dx, h = 5
  return (
    <g stroke={color} strokeOpacity={op} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <line x1={x} y1={y} x2={ex} y2={ey} />
      <path d={`M ${ex + ax * h + px * h} ${ey + ay * h + py * h} L ${ex} ${ey} L ${ex + ax * h - px * h} ${ey + ay * h - py * h}`} />
    </g>
  )
}

export default function HouseDiagram({
  houseType = 'detached',
  storeys = 2,
  basementType = 'full_heated',
  components = null,
  highlight = null,        // 'ceiling'|'walls'|'windows'|'basement'|'rimJoist'|'chimney'|'recessedLights'
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
  const hasRim = !slab && basementType !== 'none'

  const contentTop = houseType === 'apartment' ? top - 22 : roofPeak
  const minY = contentTop - 22
  const maxY = GRADE + belowDepth + 16

  // ── emphasis helpers ──
  const hi = (k) => highlight === k
  const fade = (k) => (highlight && highlight !== k ? 0.28 : 1)   // dim non-highlighted
  // line colour for a structural part
  const ln = (k, baseOp) => hi(k)
    ? { stroke: EMB, strokeOpacity: 1 }
    : { stroke: 'currentColor', strokeOpacity: baseOp * fade(k) }
  // arrow appearance for a part
  const arrow = (k, share) => highlight
    ? (hi(k) ? { w: 3.4, op: 1, color: EMB } : { w: 1.6, op: 0.3, color: EM })
    : { w: weight(share), op: 1, color: EM }

  // heat-loss shares (results mode)
  const total = components ? Object.values(components).reduce((s, v) => s + (v > 0 ? v : 0), 0) : 0
  const share = (keys) => (!components || total <= 0) ? null
    : keys.reduce((s, k) => s + (components[k] > 0 ? components[k] : 0), 0) / total

  const aRoof = arrow('ceiling', share(['ceiling']))
  const aWall = arrow('walls',   share(['walls']))
  const aWin  = arrow('windows', share(['windows', 'doors']))
  const aBase = arrow('basement', share(['basementWalls', 'basementFloor']))

  // windows
  const windows = []
  const winW = 16, winH = 18
  for (let s = 0; s < full; s++) {
    const cy = GRADE - s * STOREY_H - STOREY_H / 2 - winH / 2
    windows.push({ x: CENTER - 34, y: cy }, { x: CENTER + 18, y: cy })
  }

  // pot lights along the top-floor ceiling
  const potLights = [CENTER - 38, CENTER - 13, CENTER + 12, CENTER + 37].filter(x => x > left + 6 && x < right - 6)

  // chimney geometry (right of the ridge)
  const chimX = CENTER + 22, chimW = 12
  const chimTop = (flatRoof ? roofPeak : roofPeak + 16) - 14

  const labelX = right + 40

  return (
    <DiagramFrame caption={caption} className={className}>
      <svg viewBox={`0 ${minY} ${VB_W} ${maxY - minY}`} className="w-full h-auto" role="img"
        aria-label={`Cutaway of a ${storeys}-storey ${houseType} home${highlight ? `, highlighting ${highlight}` : ''}`}>

        {/* grade line */}
        <line x1="12" y1={GRADE} x2={VB_W - 12} y2={GRADE} stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="3 3" />

        {/* neighbour stubs on shared sides */}
        {!exp.left && houseType !== 'apartment' && (
          <rect x={left - 30} y={top + 14} width="30" height={bodyH - 14} fill="currentColor" fillOpacity="0.04" stroke="currentColor" strokeOpacity="0.22" strokeDasharray="2 2" />
        )}
        {!exp.right && houseType !== 'apartment' && (
          <rect x={right} y={top + 14} width="30" height={bodyH - 14} fill="currentColor" fillOpacity="0.04" stroke="currentColor" strokeOpacity="0.22" strokeDasharray="2 2" />
        )}
        {houseType === 'apartment' && (
          <g fill="currentColor" fillOpacity="0.04" stroke="currentColor" strokeOpacity="0.2" strokeDasharray="2 2">
            <rect x={left - 26} y={top} width="26" height={bodyH} />
            <rect x={right} y={top} width="26" height={bodyH} />
            <rect x={left} y={top - 22} width={bodyW} height="22" />
          </g>
        )}

        {/* ── chimney ── */}
        <rect x={chimX} y={chimTop} width={chimW} height={GRADE - chimTop - bodyH + (flatRoof ? 0 : 30)}
          fill={hi('chimney') ? EMB : 'currentColor'} fillOpacity={hi('chimney') ? 0.5 : 0.1 * fade('chimney')}
          stroke={hi('chimney') ? EMB : 'currentColor'} strokeOpacity={hi('chimney') ? 1 : 0.45 * fade('chimney')}
          strokeWidth={hi('chimney') ? 1.5 : 1} />

        {/* ── roof / attic ── */}
        {flatRoof ? (
          <rect x={left - overhang} y={roofPeak} width={bodyW + overhang * 2} height={roofH} fill="currentColor" fillOpacity={0.08 * fade('ceiling')} {...ln('ceiling', 0.55)} />
        ) : (
          <polygon points={`${CENTER},${roofPeak} ${right + overhang},${top} ${left - overhang},${top}`} fill="currentColor" fillOpacity={0.06 * fade('ceiling')} {...ln('ceiling', 0.55)} />
        )}
        {!flatRoof && bodyH >= STOREY_H && !highlight && (
          <text x={CENTER} y={top - 10} textAnchor="middle" fill="currentColor" fillOpacity="0.55" fontSize="9">attic</text>
        )}

        {/* ── house body ── */}
        <rect x={left} y={top} width={bodyW} height={bodyH} fill="currentColor" fillOpacity={0.05 * (highlight && !hi('walls') ? 0.6 : 1)} stroke="currentColor" strokeOpacity={0.6 * fade('walls')} />
        {/* storey dividers */}
        {Array.from({ length: full }, (_, i) => i + 1).slice(0, -1).map(i => (
          <line key={i} x1={left} y1={GRADE - i * STOREY_H} x2={right} y2={GRADE - i * STOREY_H} stroke="currentColor" strokeOpacity={0.22 * fade('walls')} strokeWidth="1" />
        ))}
        {/* ceiling line (insulated boundary) */}
        <line x1={left} y1={top} x2={right} y2={top} {...ln('ceiling', 0.7)} strokeWidth={hi('ceiling') ? 3.5 : 2.5} />

        {/* exposed-wall emphasis when walls highlighted */}
        {hi('walls') && exp.left  && <line x1={left}  y1={top} x2={left}  y2={GRADE} stroke={EMB} strokeWidth="3.5" />}
        {hi('walls') && exp.right && <line x1={right} y1={top} x2={right} y2={GRADE} stroke={EMB} strokeWidth="3.5" />}
        {/* party-wall emphasis (shared sides, no loss) */}
        {!exp.left  && <line x1={left}  y1={top} x2={left}  y2={GRADE} stroke="currentColor" strokeOpacity={0.5 * fade('walls')} strokeWidth="3" />}
        {!exp.right && <line x1={right} y1={top} x2={right} y2={GRADE} stroke="currentColor" strokeOpacity={0.5 * fade('walls')} strokeWidth="3" />}

        {/* ── pot lights (top-floor ceiling) ── */}
        {potLights.map((x, i) => (
          <circle key={i} cx={x} cy={top + 7} r="3.4"
            fill={hi('recessedLights') ? EMB : 'currentColor'} fillOpacity={hi('recessedLights') ? 0.85 : 0.18 * fade('recessedLights')}
            stroke={hi('recessedLights') ? EMB : 'currentColor'} strokeOpacity={hi('recessedLights') ? 1 : 0.3 * fade('recessedLights')} strokeWidth="0.75" />
        ))}

        {/* ── windows ── */}
        {windows.map((w, i) => (
          <rect key={i} x={w.x} y={w.y} width={winW} height={winH}
            fill={hi('windows') ? EMB : 'currentColor'} fillOpacity={hi('windows') ? 0.45 : 0.12 * fade('windows')}
            {...ln('windows', 0.55)} />
        ))}

        {/* ── rim joist band ── */}
        {hasRim && (
          <rect x={left} y={GRADE - 5} width={bodyW} height="6"
            fill={hi('rimJoist') ? EMB : EM} fillOpacity={hi('rimJoist') ? 0.95 : 0.55 * fade('rimJoist')}
            stroke={hi('rimJoist') ? EMB : EM} strokeOpacity={hi('rimJoist') ? 1 : 0.7 * fade('rimJoist')} strokeWidth={hi('rimJoist') ? 1.5 : 0.75} />
        )}

        {/* ── below grade ── */}
        {belowDepth > 0 && (
          <>
            <rect x={left} y={GRADE} width={bodyW} height={belowDepth} fill="currentColor" fillOpacity={0.04 * fade('basement')} {...ln('basement', 0.45)} />
            <line x1={left} y1={GRADE + belowDepth * 0.5} x2={right} y2={GRADE + belowDepth * 0.5} stroke="currentColor" strokeOpacity={0.14 * fade('basement')} strokeWidth="0.75" />
          </>
        )}
        {slab && <rect x={left} y={GRADE - 2} width={bodyW} height="6" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeOpacity="0.5" />}

        {/* ── heat-loss arrows ── */}
        <Arrow x={CENTER} y={flatRoof ? roofPeak : roofPeak + 14} dx={0} dy={-1} {...aRoof} />
        {exp.left  && <Arrow x={left}  y={top + bodyH * 0.4} dx={-1} dy={0} {...aWall} />}
        {exp.right && <Arrow x={right} y={top + bodyH * 0.6} dx={1}  dy={0} {...aWall} />}
        {windows[0] && <Arrow x={windows[0].x} y={windows[0].y + winH / 2} dx={-0.8} dy={0.6} {...aWin} />}
        {hasBasement && exp.left  && <Arrow x={left}  y={GRADE + belowDepth * 0.5} dx={-1} dy={0} {...aBase} />}
        {hasBasement && exp.right && <Arrow x={right} y={GRADE + belowDepth * 0.5} dx={1}  dy={0} {...aBase} />}
        {hasBasement && !exp.left && !exp.right && <Arrow x={right} y={GRADE + belowDepth * 0.5} dx={1} dy={0} {...aBase} />}

        {/* ── labels ── */}
        {showLabels && (
          <g fontSize="10" fontFamily="sans-serif">
            <Label show={(!highlight || hi('ceiling')) && exp.roof} em={hi('ceiling')} x={labelX} y={top - 6} lx1={CENTER + 20} ly1={roofPeak + 12} lx2={labelX - 4} ly2={top - 10} text="Ceiling / attic" />
            <Label show={(!highlight || hi('walls')) && (exp.left || exp.right)} em={hi('walls')} noLine={!exp.right} x={labelX} y={top + bodyH * 0.6 - 4} lx1={right} ly1={top + bodyH * 0.6} lx2={labelX - 4} ly2={top + bodyH * 0.6 - 6} text="Walls" />
            <Label show={!highlight || hi('windows')} em={hi('windows')} x={labelX} y={top + bodyH * 0.72} lx1={CENTER + 18 + winW} ly1={GRADE - STOREY_H / 2 - 2} lx2={labelX - 4} ly2={top + bodyH * 0.72 - 3} text="Windows" />
            <Label show={(!highlight || hi('chimney'))} em={hi('chimney')} noLine={!hi('chimney')} x={labelX} y={chimTop + 6} text="Chimney" />
            <Label show={hi('recessedLights')} em x={labelX} y={top + 12} lx1={right} ly1={top + 7} lx2={labelX - 4} ly2={top + 9} text="Pot lights" />
            <Label show={(!highlight || hi('rimJoist')) && hasRim} em={hi('rimJoist')} x={labelX} y={GRADE + 4} lx1={right} ly1={GRADE - 2} lx2={labelX - 4} ly2={GRADE + 1} text="Rim joist" />
            <Label show={(!highlight || hi('basement')) && hasBasement} em={hi('basement')} x={labelX} y={GRADE + belowDepth * 0.5 + 4} lx1={right} ly1={GRADE + belowDepth * 0.5} lx2={labelX - 4} ly2={GRADE + belowDepth * 0.5 + 1} text="Basement walls" />
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
      {!noLine && <line x1={lx1} y1={ly1} x2={lx2} y2={ly2} stroke={em ? EMB : 'currentColor'} strokeOpacity={em ? 0.8 : 0.4} strokeWidth="0.75" />}
      <text x={x} y={y} fill={em ? EMB : 'currentColor'} fillOpacity={em ? 1 : 0.85} fontWeight={em ? 'bold' : 'normal'}>{text}</text>
    </>
  )
}
