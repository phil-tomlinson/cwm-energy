import { useEffect } from 'react'
import { eraDefaults, exposedWallFactor } from '../../data/houseDefaults'
import { buildEnvelopeFromDefaults } from '../../calculations/heatLoss'
import Card, { CardSection } from '../ui/Card'
import { NumberField, AreaField } from '../ui/FormField'
import WindowEstimator from '../estimators/WindowEstimator'
import FootprintEstimator from '../estimators/FootprintEstimator'

const BASEMENT_HEIGHT = 2.1
const BELOW_GRADE_FRACTION = 0.55

const ACH_DESCRIPTORS = [
  { max: 0.2,  label: 'Very tight (new construction, blower-door tested)' },
  { max: 0.35, label: 'Tight (well-sealed, 2000s construction)' },
  { max: 0.55, label: 'Average (typical existing house)' },
  { max: 0.8,  label: 'Leaky (older house, noticeable drafts)' },
  { max: 99,   label: 'Very leaky (old, poorly maintained)' },
]

function achDescription(ach) {
  return ACH_DESCRIPTORS.find(d => ach <= d.max)?.label ?? ''
}

export default function Step3Envelope({ data, updateData }) {
  useEffect(() => {
    if (!data.envelope) {
      const defaults = eraDefaults[data.era]
      const envelope = buildEnvelopeFromDefaults(
        data.houseType, data.floorArea, data.storeys, data.basementType, defaults
      )
      updateData({ envelope })
    }
  }, [data.era, data.houseType, data.floorArea, data.storeys, data.basementType])

  const env = data.envelope
  if (!env) return <div className="text-zinc-500 text-sm p-4">Calculating defaults…</div>

  function update(field, value) {
    updateData({ envelope: { ...env, [field]: value } })
  }

  const era         = eraDefaults[data.era]
  const ef          = exposedWallFactor[data.houseType] ?? 1.0
  const wallHeight  = data.ceilingHeight ?? 2.44
  const units       = data.units ?? 'metric'
  const hasBasement = env.basementWallArea > 0 || env.basementFloorArea > 0

  // ── Estimator formulas (all receive metres, regardless of display units) ──

  function ceilingEstimate(l, w) {
    const area = l * w
    return {
      value: area,
      rows: [{ label: `${l} m × ${w} m`, value: `${area.toFixed(1)} m²`, highlight: true }],
    }
  }

  function wallEstimate(l, w) {
    const perimeter  = 2 * (l + w)
    const grossWall  = perimeter * wallHeight * data.storeys * ef
    const netWall    = Math.max(0, grossWall - env.windowArea - env.doorArea)
    return {
      value: netWall,
      rows: [
        { label: 'Perimeter',                                              value: `${perimeter.toFixed(1)} m` },
        { label: `× ${wallHeight.toFixed(2)} m height × ${data.storeys} storey(s)`, value: `${(perimeter * wallHeight * data.storeys).toFixed(1)} m²` },
        { label: `× ${ef} exposed wall factor (${data.houseType})`,       value: `${grossWall.toFixed(1)} m² gross` },
        { label: 'Less windows & doors',                                   value: `− ${(env.windowArea + env.doorArea).toFixed(1)} m²` },
        { label: 'Net wall area',                                          value: `${netWall.toFixed(1)} m²`, highlight: true },
      ],
    }
  }

  function basementWallEstimate(l, w) {
    const perimeter = 2 * (l + w)
    const area = perimeter * BASEMENT_HEIGHT * BELOW_GRADE_FRACTION * ef
    return {
      value: area,
      rows: [
        { label: 'Perimeter',                                    value: `${perimeter.toFixed(1)} m` },
        { label: `× ${BASEMENT_HEIGHT} m wall × ${BELOW_GRADE_FRACTION} below grade`, value: `${(perimeter * BASEMENT_HEIGHT * BELOW_GRADE_FRACTION).toFixed(1)} m²` },
        { label: `× ${ef} exposed factor (${data.houseType})`,  value: `${area.toFixed(1)} m²`, highlight: true },
      ],
    }
  }

  function basementFloorEstimate(l, w) {
    const area = l * w
    return {
      value: area,
      rows: [{ label: `${l} m × ${w} m`, value: `${area.toFixed(1)} m²`, highlight: true }],
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-zinc-100 mb-1">Building envelope</h2>
      <p className="text-zinc-500 text-sm mb-2">
        We've pre-filled these values based on your home's age. Adjust anything you know for better accuracy.
      </p>
      <p className="text-xs text-emerald-400 bg-emerald-400/5 border border-emerald-400/20 px-3 py-2 mb-6">
        R-values are imperial (as on product labels). Areas are auto-estimated from your floor area — use the estimators below each field if you want to refine them.
      </p>

      {/* ── Ceiling ── */}
      <Card className="mb-4">
        <CardSection title="Ceiling / Attic" hint="The insulation between your top-floor ceiling and the attic or roof.">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <AreaField
                label="Ceiling area"
                value={env.ceilingArea}
                onChange={v => update('ceilingArea', v)}
                units={units}
              />
              <FootprintEstimator
                buttonLabel="Estimate from house dimensions"
                calculate={ceilingEstimate}
                onApply={v => update('ceilingArea', v)}
                units={units}
              />
            </div>
            <NumberField
              label="Insulation R-value"
              value={env.ceilingR}
              onChange={v => update('ceilingR', v)}
              min={0} max={100} step={1} unit="R"
              defaultNote={`R-${era.ceilingR}`}
              hint="e.g. R-40 = good, R-60 = excellent"
            />
          </div>
        </CardSection>
      </Card>

      {/* ── Above-grade walls ── */}
      <Card className="mb-4">
        <CardSection title="Above-grade walls" hint="Net wall area (total exterior wall minus windows and doors).">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <AreaField
                label="Net wall area"
                value={env.netWallArea}
                onChange={v => update('netWallArea', v)}
                units={units}
              />
              <FootprintEstimator
                buttonLabel="Estimate from house dimensions"
                calculate={wallEstimate}
                onApply={v => update('netWallArea', v)}
                units={units}
              />
            </div>
            <NumberField
              label="Wall R-value"
              value={env.wallR}
              onChange={v => update('wallR', v)}
              min={0} max={80} step={1} unit="R"
              defaultNote={`R-${era.wallR}`}
              hint="Includes cavity + any continuous insulation"
            />
          </div>
        </CardSection>
      </Card>

      {/* ── Windows ── */}
      <Card className="mb-4">
        <CardSection title="Windows" hint="Total glazed area including frames.">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <AreaField
                label="Window area"
                value={env.windowArea}
                onChange={v => update('windowArea', v)}
                units={units}
              />
              <WindowEstimator
                storeys={data.storeys}
                basementType={data.basementType}
                onApply={v => update('windowArea', v)}
              />
            </div>
            <NumberField
              label="U-value"
              value={env.windowU}
              onChange={v => update('windowU', v)}
              min={0.5} max={6.0} step={0.1} unit="W/m²·K"
              defaultNote={`${era.windowU}`}
              hint="Single pane ≈ 5.0 | Double ≈ 2.8 | Triple ≈ 1.6"
            />
          </div>
        </CardSection>

        <CardSection title="Exterior doors">
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              label="Number of exterior doors"
              value={env.doorCount}
              onChange={v => update('doorCount', v)}
              min={0} max={10} step={1}
            />
            <NumberField
              label="Door U-value"
              value={env.doorU}
              onChange={v => update('doorU', v)}
              min={0.5} max={5.0} step={0.1} unit="W/m²·K"
              defaultNote={`${era.doorU}`}
              hint="Solid wood ≈ 3.5 | Insulated steel ≈ 1.6"
            />
          </div>
        </CardSection>
      </Card>

      {/* ── Basement ── */}
      {hasBasement && (
        <Card className="mb-4">
          <CardSection title="Basement / Foundation">
            {env.basementWallArea > 0 && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <AreaField
                    label="Below-grade wall area"
                    value={env.basementWallArea}
                    onChange={v => update('basementWallArea', v)}
                    units={units}
                  />
                  <FootprintEstimator
                    buttonLabel="Estimate from house dimensions"
                    calculate={basementWallEstimate}
                    onApply={v => update('basementWallArea', v)}
                    units={units}
                  />
                </div>
                <NumberField
                  label="Wall R-value"
                  value={env.basementWallR}
                  onChange={v => update('basementWallR', v)}
                  min={0} max={40} step={1} unit="R"
                  defaultNote={`R-${era.basementWallR}`}
                  hint="Uninsulated ≈ R-0 | Typical ≈ R-10 to R-20"
                />
              </div>
            )}
            {env.basementFloorArea > 0 && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <AreaField
                    label="Basement floor area"
                    value={env.basementFloorArea}
                    onChange={v => update('basementFloorArea', v)}
                    units={units}
                  />
                  <FootprintEstimator
                    buttonLabel="Estimate from house dimensions"
                    calculate={basementFloorEstimate}
                    onApply={v => update('basementFloorArea', v)}
                    units={units}
                  />
                </div>
                <NumberField
                  label="Floor R-value"
                  value={env.basementFloorR}
                  onChange={v => update('basementFloorR', v)}
                  min={0} max={40} step={1} unit="R"
                  defaultNote={`R-${era.basementFloorR}`}
                  hint="Uninsulated slab = R-0 | Insulated = R-5 to R-20"
                />
              </div>
            )}
          </CardSection>
        </Card>
      )}

      {/* ── Air leakage ── */}
      <Card>
        <CardSection
          title="Air leakage"
          hint="How many times per hour indoor air is replaced by outdoor air through gaps and cracks."
        >
          <NumberField
            label="Air changes per hour (ACH)"
            value={env.ach}
            onChange={v => update('ach', v)}
            min={0.05} max={2.0} step={0.05}
            defaultNote={`${era.ach} ACH`}
          />
          <p className="text-xs text-emerald-400 mt-1">{achDescription(env.ach)}</p>
        </CardSection>
      </Card>
    </div>
  )
}
