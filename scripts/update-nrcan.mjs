#!/usr/bin/env node
/**
 * Fetches NRCan fuel consumption ratings CSVs and writes parsed JSON to
 * src/data/nrcan-vehicles.json
 *
 * Run manually when new model year data is released (typically spring):
 *   npm run update-nrcan
 *
 * Also runs as an optional prebuild step on Vercel — failures are non-fatal
 * so the build continues with the last committed JSON file.
 *
 * Data source: https://open.canada.ca/data/en/dataset/98f1a129-f628-4ce4-b24d-6f16bf24dd64
 * Requires Node.js 18+ (uses built-in fetch).
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_PATH  = resolve(__dirname, '../src/data/nrcan-vehicles.json')

// ── NRCan open-data CSV URLs ───────────────────────────────────────────────
const SOURCES = [
  {
    url: 'https://open.canada.ca/data/dataset/98f1a129-f628-4ce4-b24d-6f16bf24dd64/resource/026e45b4-eb63-451f-b34f-d9308ea3a3d9/download/my2012-2026-battery-electric-vehicles.csv',
    type: 'ev',
    label: 'BEV 2012-2026',
  },
  {
    url: 'https://open.canada.ca/data/dataset/98f1a129-f628-4ce4-b24d-6f16bf24dd64/resource/8812228b-a6aa-4303-b3d0-66489225120d/download/my2012-2026-plug-in-hybrid-electric-vehicles.csv',
    type: 'phev',
    label: 'PHEV 2012-2026',
  },
  {
    url: 'https://open.canada.ca/data/dataset/98f1a129-f628-4ce4-b24d-6f16bf24dd64/resource/c98b9dc8-b23f-4cd8-8b19-e892da1e4688/download/my2015-2024-fuel-consumption-ratings.csv',
    type: 'ice',
    label: 'Conventional 2015-2024',
  },
  {
    url: 'https://open.canada.ca/data/dataset/98f1a129-f628-4ce4-b24d-6f16bf24dd64/resource/d589f2bc-9a85-4f65-be2f-20f17debfcb1/download/my2025-fuel-consumption-ratings.csv',
    type: 'ice',
    label: 'Conventional 2025',
  },
  {
    url: 'https://open.canada.ca/data/dataset/98f1a129-f628-4ce4-b24d-6f16bf24dd64/resource/9df1b18d-d036-4783-a61c-99f1f75b3ac5/download/my2026-fuel-consumption-ratings.csv',
    type: 'ice',
    label: 'Conventional 2026',
  },
]

// ── CSV parsing ────────────────────────────────────────────────────────────
function parseCsv(text) {
  const clean = text.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = clean.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim())
  return lines.slice(1).map(line => {
    const vals = line.split(',')
    const row = {}
    headers.forEach((h, i) => { row[h] = (vals[i] ?? '').trim() })
    return row
  }).filter(r => r['Model year'] && r['Make'])
}

function num(s) {
  const n = parseFloat(s ?? '')
  return isNaN(n) || n === 0 ? null : n
}

// PHEV "Combined Le/100 km" field: "2.5 (22.3 kWh/100 km)" → 22.3
function parsePhevKwh(s) {
  const m = (s ?? '').match(/\(([0-9.]+)\s*kWh/)
  return m ? parseFloat(m[1]) : null
}

function parseSource({ text, type }) {
  const rows = parseCsv(text)
  return rows.map(r => {
    const base = {
      year:         parseInt(r['Model year'] ?? '0'),
      make:         r['Make'] ?? '',
      model:        r['Model'] ?? '',
      vehicleClass: r['Vehicle class'] ?? '',
      type,
      transmission: r['Transmission'] ?? '',
    }

    if (type === 'ev') {
      const kw  = num(r['Combined (kWh/100 km)'])
      const rng = num(r['Range (km)'])
      const co2 = num(r['CO2 emissions (g/km)'])
      return { ...base, effKwh100km: kw, evRangeKm: rng, ...(co2 != null && { co2gkm: co2 }) }
    }

    if (type === 'phev') {
      const kw  = parsePhevKwh(r['Combined Le/100 km'])
      const fc  = num(r['Combined (L/100 km)'])
      const rng = num(r['Range 1 (km)'])
      const co2 = num(r['CO2 emissions (g/km)'])
      return { ...base, effKwh100km: kw, fuelL100km: fc, evRangeKm: rng, ...(co2 != null && { co2gkm: co2 }) }
    }

    // ice
    const fc  = num(r['Combined (L/100 km)'])
    const co2 = num(r['CO2 emissions (g/km)'])
    return { ...base, fuelL100km: fc, ...(co2 != null && { co2gkm: co2 }) }
  }).filter(v => v.year > 0 && v.make)
}

// ── Main ──────────────────────────────────────────────────────────────────
function main() {
  console.log('Fetching NRCan fuel consumption data…\n')

  const results = []
  let anyFailed = false

  for (const source of SOURCES) {
    process.stdout.write(`  ${source.label}… `)
    try {
      // Use curl for reliable redirect-following across all environments
      const text = execSync(`curl -sL --max-time 60 "${source.url}"`, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
      if (!text || text.trim().length < 50) throw new Error('Empty or too-short response')
      const rows = parseSource({ text, type: source.type })
      results.push(...rows)
      console.log(`${rows.length} vehicles`)
    } catch (err) {
      console.log(`FAILED — ${err.message}`)
      anyFailed = true
    }
  }

  if (results.length === 0) {
    console.error('\nNo data fetched. Keeping existing file (if any).')
    process.exit(0)  // non-fatal — build continues with committed JSON
  }

  const meta = {
    generatedAt:   new Date().toISOString(),
    totalVehicles: results.length,
    breakdown: {
      ev:   results.filter(v => v.type === 'ev').length,
      phev: results.filter(v => v.type === 'phev').length,
      ice:  results.filter(v => v.type === 'ice').length,
    },
  }

  // Ensure output directory exists
  const outDir = resolve(__dirname, '../src/data')
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

  const output = JSON.stringify({ meta, vehicles: results })
  writeFileSync(OUT_PATH, output)

  const kb = (output.length / 1024).toFixed(0)
  console.log(`\n✓ ${results.length} vehicles written to src/data/nrcan-vehicles.json (${kb} KB)`)
  console.log(`  BEV: ${meta.breakdown.ev}  PHEV: ${meta.breakdown.phev}  ICE/Hybrid: ${meta.breakdown.ice}`)

  if (anyFailed) {
    console.warn('\n⚠ Some sources failed — data may be incomplete. Commit the file if counts look reasonable.')
  }
}

try {
  main()
} catch (err) {
  console.error('Fatal error:', err.message)
  process.exit(0)  // non-fatal — build continues with committed JSON
}
