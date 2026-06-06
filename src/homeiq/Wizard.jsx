'use client'
import { useState } from 'react'
import ProgressBar from './ui/ProgressBar'
import Button from './ui/Button'
import ModeSelector from './ui/ModeSelector'
import SimpleMode from './modes/SimpleMode'
import TechnicalMode from './modes/TechnicalMode'
import Step1Location from './steps/Step1Location'
import Step2Home from './steps/Step2Home'
import Step3Envelope from './steps/Step3Envelope'
import Step4Heating from './steps/Step4Heating'
import Step5WaterHeater from './steps/Step5WaterHeater'
import { buildEnvelopeFromDefaults } from '../calculations/heatLoss'
import { computeHomeResults } from '../calculations/homeResults'
import { getFuelCostPerGJ } from '../data/energyPrices'
import { eraDefaults } from '../data/houseDefaults'

const STEPS = ['Location', 'Your Home', 'Envelope', 'Heating', 'Water Heater']

const DEFAULT_STATE = {
  mode:         'simple',    // 'simple' | 'refined' | 'technical'
  units:        'metric',
  province:     'AB',
  city:         'Calgary',
  climate:      { hdd: 5000, designTemp: -23, coldWaterTemp: 7 },
  houseType:    'detached',
  storeys:      2,
  floorArea:    180,
  ceilingHeight: 2.44,
  // Typical Canadian residential basement wall height of 2.1 m (7 ft) in older homes,
  // 2.4–2.7 m in newer construction. Per NRCan HOT2000 Technical Manual default assumptions.
  basementWallHeight: 2.1,
  era:          '1980_1999',
  basementType: 'full_heated',
  envelope:     null,
  airLeakageFactors: {
    chimney:          'none',   // 'none' | 'masonry' | 'wood_insert' | 'gas_vented' | 'gas_sealed'
    exposedRimJoists: false,
    recessedLights:   false,
  },
  // HRV/ERV: heat recovery ventilator presence and sensible effectiveness (0–1).
  // Typical HRV effectiveness: 70–80%. ERV: 60–75%. Per CSA C439 / NRCan EnerGuide.
  hrv: { has: false, effectiveness: 0.75 },
  // Solar inputs: fraction of total window area facing south (within 30° of due south).
  // Default 25% assumes roughly equal distribution across 4 facades.
  solarInputs: { southFraction: 0.25 },
  heating: {
    systemId:     'furnace_80',
    fuelType:     'naturalGas',
    systemType:   'furnace_80',
    efficiency:   0.80,
    fuelCostPerGJ: getFuelCostPerGJ('AB', 'naturalGas'),
  },
  waterHeater: {
    type:         'storage_gas',
    uef:          0.60,
    fuelType:     'naturalGas',
    occupants:    3,
    fuelCostPerGJ: getFuelCostPerGJ('AB', 'naturalGas'),
  },
}

export default function Wizard({ onComplete }) {
  const [step, setStep] = useState(0)
  const [data, setData] = useState(DEFAULT_STATE)

  function updateData(updates) {
    setData(prev => ({ ...prev, ...updates }))
  }

  function handleModeChange(newMode) {
    // When entering Technical mode, pre-compute envelope so fields are populated
    if (newMode === 'technical' && !data.envelope) {
      const era = eraDefaults[data.era]
      const envelope = buildEnvelopeFromDefaults(
        data.houseType, data.floorArea, data.storeys, data.basementType, era, data.basementWallHeight ?? 2.1
      )
      setData(prev => ({ ...prev, mode: newMode, envelope }))
    } else {
      updateData({ mode: newMode })
    }
    setStep(0)
  }

  function handleBack()  { setStep(s => s - 1) }
  function handleNext()  {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else runCalculations()
  }

  function runCalculations() {
    onComplete(computeHomeResults(data))
  }

  // ── Refined mode: 5-step wizard ──────────────────────────────
  const refinedSteps = [
    <Step1Location    key="s1" data={data} updateData={updateData} />,
    <Step2Home        key="s2" data={data} updateData={updateData} />,
    <Step3Envelope    key="s3" data={data} updateData={updateData} />,
    <Step4Heating     key="s4" data={data} updateData={updateData} />,
    <Step5WaterHeater key="s5" data={data} updateData={updateData} />,
  ]

  return (
    <div>
      {/* Units toggle */}
      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={() => updateData({ units: data.units === 'metric' ? 'imperial' : 'metric' })}
          className="text-xs border border-zinc-600 overflow-hidden flex"
          title="Switch unit system"
        >
          <span className={`px-3 py-1.5 font-mono transition-colors ${data.units === 'metric' ? 'bg-emerald-400 text-zinc-950 font-bold' : 'bg-transparent text-zinc-400'}`}>m</span>
          <span className={`px-3 py-1.5 font-mono transition-colors ${data.units === 'imperial' ? 'bg-emerald-400 text-zinc-950 font-bold' : 'bg-transparent text-zinc-400'}`}>ft</span>
        </button>
      </div>

      {/* Mode selector */}
      <ModeSelector mode={data.mode} onChange={handleModeChange} />

      {/* ── Simple mode ──────────────────────────────────────── */}
      {data.mode === 'simple' && (
        <>
          <SimpleMode data={data} updateData={updateData} />
          <div className="mt-8">
            <Button onClick={runCalculations} className="w-full justify-center py-3">
              Calculate Results →
            </Button>
          </div>
        </>
      )}

      {/* ── Refined mode ─────────────────────────────────────── */}
      {data.mode === 'refined' && (
        <>
          <ProgressBar current={step} total={STEPS.length} labels={STEPS} />
          <div className="mt-8">
            {refinedSteps[step]}
          </div>
          <div className="mt-8 flex justify-between">
            {step > 0
              ? <Button variant="outline" onClick={handleBack}>← Back</Button>
              : <div />
            }
            <Button onClick={handleNext}>
              {step < STEPS.length - 1 ? 'Next →' : 'Calculate Results'}
            </Button>
          </div>
        </>
      )}

      {/* ── Technical mode ───────────────────────────────────── */}
      {data.mode === 'technical' && (
        <>
          <TechnicalMode data={data} updateData={updateData} />
          <div className="mt-8">
            <Button onClick={runCalculations} className="w-full justify-center py-3">
              Calculate Results →
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
