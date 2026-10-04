// Canvas charts (Chart.js) can't read CSS variables, so they resolve the design
// tokens at draw time. Redraw when the theme changes to pick up the new values.

const FALLBACK: Record<string, string> = {
  '--snowfield': '#F6F8F7', '--snowfield-raised': '#FFFFFF', '--basalt': '#1A2A36',
  '--scree': '#56656B', '--hairline': '#D5DDDC', '--glacier': '#16698A',
  '--fireweed': '#C7366F', '--larch': '#F2B33D',
  '--series-1': '#16698A', '--series-2': '#C7366F', '--series-3': '#2E7D3E',
  '--series-4': '#8A5A00', '--series-custom': '#1A2A36',
}

export function token(name: string): string {
  if (typeof window === 'undefined') return FALLBACK[name] ?? '#000000'
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || FALLBACK[name] || '#000000'
}

/** Turn "var(--series-1)" into its current colour; pass other colours through. */
export function resolveColor(c: string): string {
  const m = /^var\((--[\w-]+)\)$/.exec(c.trim())
  return m ? token(m[1]) : c
}

export function withAlpha(color: string, alpha: number): string {
  const hex = resolveColor(color).replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return color
  const n = parseInt(hex, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

export const CHART_FONT = '"Overpass Variable", "Overpass", system-ui, sans-serif'
