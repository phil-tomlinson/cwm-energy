'use client'
import { useState } from 'react'
import ProgressBar from './ui/ProgressBar'
import Button from './ui/Button'
import Step1Location from './steps/Step1Location'
import Step2Home from './steps/Step2Home'
import Step3Envelope from './steps/Step3Envelope'
import Step4Heating from './steps/Step4Heating'
import Step5WaterHeater from './steps/Step5WaterHeater'
import { calculateHeatLoss, buildEnvelopeFromDefaults } from '../calculations/heatLoss'
import { calculateWaterHeater } from '../calculations/waterHeater'
import { generateRecommendations } from '../calculations/recommendations'
import { getFuelCostPerGJ } from '../data/energyPrices'
import { eraDefaults } from '../data/houseDefaults'
import { getClimateData } from '../data/climateData'

const STEPS = ['Location', 'Your Home', 'Envelope', 'Heating', 'Water Heater']

const DEFAULT_STATE = {
  units:        'metric',     // 'metric' | 'imperial' — UI display only; all state stored in SI
  province:     'AB',
  city:         'Calgary',
  climate:      { hdd: 5000, designTemp: -23, coldWaterTemp: 7 },
  houseType:    'detached',
  storeys:      2,
  floorArea:    180,
  ceilingHeight: 2.44,        // metres (= 8 ft, the most common Canadian ceiling height)
  era:          '1980_1999',
  basementType: 'full_heated',
  envelope:     null,   // computed on demand in Step3
  heating: {
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

  function handleBack() {
    setStep(s => s - 1)
  }

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      runCalculations()
    }
  }

  function runCalculations() {
    // Ensure envelope is built
    const era = eraDefaults[data.era]
    const envelope = data.envelope ?? buildEnvelopeFromDefaults(
      data.houseType, data.floorArea, data.storeys, data.basementType, era
    )

    const fuelCostPerGJ     = data.heating.fuelCostPerGJ ?? getFuelCostPerGJ(data.province, data.heating.fuelType)
    const whFuelCostPerGJ   = data.waterHeater.fuelCostPerGJ ?? getFuelCostPerGJ(data.province, data.waterHeater.fuelType)
    const electricityCostPerGJ = getFuelCostPerGJ(data.province, 'electricity')

    const heatLossResult = calculateHeatLoss({
      climate:       data.climate,
      envelope,
      floorArea:     data.floorArea,
      storeys:       data.storeys,
      basementType:  data.basementType,
      ceilingHeight: data.ceilingHeight ?? 2.44,
      heating: {
        efficiency:   data.heating.efficiency,
        fuelCostPerGJ,
      },
    })

    const waterHeaterResult = calculateWaterHeater(
      data.waterHeater.occupants,
      data.waterHeater.uef,
      data.waterHeater.fuelType,
      data.climate.coldWaterTemp,
      whFuelCostPerGJ,
    )

    const recommendations = generateRecommendations(
      heatLossResult,
      waterHeaterResult,
      {
        envelope,
        heating: {
          fuelType:     data.heating.fuelType,
          efficiency:   data.heating.efficiency,
          fuelCostPerGJ,
        },
        waterHeater:  data.waterHeater,
        climate:      data.climate,
        electricityCostPerGJ,
      }
    )

    onComplete({
      inputs:          data,
      envelope,
      heatLoss:        heatLossResult,
      waterHeater:     waterHeaterResult,
      recommendations,
    })
  }

  const stepComponents = [
    <Step1Location    data={data} updateData={updateData} />,
    <Step2Home        data={data} updateData={updateData} />,
    <Step3Envelope    data={data} updateData={updateData} />,
    <Step4Heating     data={data} updateData={updateData} />,
    <Step5WaterHeater data={data} updateData={updateData} />,
  ]

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <ProgressBar current={step} total={STEPS.length} labels={STEPS} />
        </div>
        <button
          type="button"
          onClick={() => updateData({ units: data.units === 'metric' ? 'imperial' : 'metric' })}
          className="mt-1 flex-shrink-0 text-xs border border-gray-300 rounded-lg overflow-hidden flex"
          title="Switch unit system"
        >
          <span className={`px-2.5 py-1.5 ${data.units === 'metric'    ? 'bg-emerald-600 text-white' : 'bg-white text-gray-500'}`}>m</span>
          <span className={`px-2.5 py-1.5 ${data.units === 'imperial'  ? 'bg-emerald-600 text-white' : 'bg-white text-gray-500'}`}>ft</span>
        </button>
      </div>

      <div className="mt-8">
        {stepComponents[step]}
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
    </div>
  )
}
