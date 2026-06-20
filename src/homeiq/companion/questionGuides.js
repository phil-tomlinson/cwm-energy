// Per-question guides for the floating companion panel. Each maps a question id
// to the house part to spotlight (`highlight`) and plain-language hints that help
// someone figure out what they actually have. Keyed by the id passed to
// <CompanionTarget id="…">.

export const GUIDES = {
  // ── Air-leakage questions (Technical mode) ──
  rimJoist: {
    title: 'Exposed rim joists',
    highlight: 'rimJoist',
    hints: [
      'Most homes on a concrete foundation have a band of wood running around the perimeter where the floor sits on the foundation wall — that’s the rim (or band) joist. It ties the upper part of your home to its foundation.',
      'Go to your basement and look up where the concrete wall meets the floor above. If you see a continuous strip of bare wood around the inside of the outer walls, with no insulation over it, that’s an exposed rim joist.',
      'If it’s already covered with insulation, drywall, or spray foam, it’s not exposed. And if you have no idea what we’re talking about, you most likely don’t have exposed rim joists — answer No.',
    ],
  },
  recessedLights: {
    title: 'Recessed pot lights',
    highlight: 'recessedLights',
    hints: [
      'Pot lights (or “can lights”) are the round light fixtures set flush into the ceiling, rather than hanging down.',
      'They only matter here when they’re in the top-floor ceiling, directly below an unheated attic — each one is a little hole that leaks warm air up into the attic.',
      'Pot lights in a ceiling that has a heated room above it don’t count. Count only those under the attic.',
    ],
  },
  chimney: {
    title: 'Chimney / fireplace',
    highlight: 'chimney',
    hints: [
      'An open masonry fireplace with a damper leaks the most air — the flue is a permanent hole in your roof. A sealed wood stove or insert leaks far less.',
      'Gas fireplaces vary: a “vented” unit (decorative glass that isn’t sealed, or a pilot light) still leaks; a “sealed-combustion / direct-vent” unit with a sealed glass front and a vent cap on an exterior wall is the tightest.',
      'No fireplace or chimney at all? Choose None.',
    ],
  },

  // ── Envelope questions (Refined mode) ──
  ceiling: {
    title: 'Ceiling / attic insulation',
    highlight: 'ceiling',
    hints: [
      'This is the insulation between your top-floor ceiling and the attic or roof above — usually the single biggest place heat escapes.',
      'If you can poke your head into the attic, deep, fluffy insulation (16–18+ inches) is a high R-value; a thin or patchy layer is low. Not sure? Leave the era default.',
    ],
  },
  walls: {
    title: 'Above-grade walls',
    highlight: 'walls',
    hints: [
      'The exterior walls above ground level. We’ve estimated the area from your floor plan — it already excludes windows and doors.',
      'Wall insulation is hard to see; the era default is usually a good guess unless you’ve had the walls re-insulated.',
    ],
  },
  windows: {
    title: 'Windows',
    highlight: 'windows',
    hints: [
      'Total glazed area, including frames. Single-pane or old aluminum frames lose a lot; double or triple-pane with a warm edge lose much less.',
      'A quick test: on a cold day, single-pane glass feels icy and may have condensation; modern double-pane stays closer to room temperature.',
    ],
  },
  basement: {
    title: 'Basement / foundation',
    highlight: 'basement',
    hints: [
      'Heat escapes through basement walls (especially the part above grade) and the floor. Finished, insulated basements lose far less than bare concrete.',
      'If your basement walls are bare poured concrete or block, they’re likely uninsulated. Stud walls with drywall usually mean insulation behind them.',
    ],
  },
}

export const DEFAULT_GUIDE = {
  title: 'Your home',
  highlight: null,
  hints: ['As you answer each question, this panel shows which part of your home we’re asking about and how to identify it.'],
}

export const getGuide = (id) => GUIDES[id] ?? DEFAULT_GUIDE
