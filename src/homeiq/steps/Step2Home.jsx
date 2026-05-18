import { houseTypes, storeyOptions, basementTypes, constructionEras } from '../../data/houseDefaults'
import { displayArea, displayLength } from '../../utils/units'
import Card, { CardSection } from '../ui/Card'
import { SelectField, AreaField, LengthField } from '../ui/FormField'

const COMMON_HEIGHTS_M = [2.13, 2.44, 2.74, 3.05]   // 7 ft, 8 ft, 9 ft, 10 ft

export default function Step2Home({ data, updateData }) {
  const units = data.units

  function handleEraChange(era) {
    updateData({ era, envelope: null })
  }
  function handleHouseTypeChange(houseType) {
    updateData({ houseType, envelope: null })
  }
  function handleBaseTypeChange(basementType) {
    updateData({ basementType, envelope: null })
  }

  const heightHint = COMMON_HEIGHTS_M.map(m => {
    const ft = Math.round(m / 0.3048)
    return units === 'imperial'
      ? `${ft} ft = ${m} m`
      : `${m} m (${ft} ft)`
  }).join(' · ')

  return (
    <div>
      <h2 className="text-xl font-bold text-zinc-100 mb-1">Tell us about your home</h2>
      <p className="text-zinc-400 text-sm mb-6">
        These details let us estimate your home's geometry and set smart defaults for insulation levels.
      </p>

      <Card>
        <CardSection title="Building type">
          <SelectField
            label="House type"
            value={data.houseType}
            onChange={handleHouseTypeChange}
            options={houseTypes}
          />

          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Above-grade storeys"
              value={data.storeys}
              onChange={v => updateData({ storeys: Number(v), envelope: null })}
              options={storeyOptions}
            />
            <SelectField
              label="Basement / foundation"
              value={data.basementType}
              onChange={handleBaseTypeChange}
              options={basementTypes}
            />
          </div>
        </CardSection>

        <CardSection
          title="Floor area"
          hint="Include all heated/cooled living space. Exclude unheated garage and unfinished basement."
        >
          <AreaField
            label="Conditioned floor area"
            value={data.floorArea}
            onChange={v => updateData({ floorArea: v, envelope: null })}
            units={units}
            hint={units === 'imperial'
              ? `≈ ${(data.floorArea * 10.764).toFixed(0)} ft²`
              : `≈ ${(data.floorArea * 10.764).toFixed(0)} ft²`}
          />
        </CardSection>

        <CardSection title="Ceiling height" hint={`Common heights — ${heightHint}`}>
          <LengthField
            label="Ceiling height (floor to ceiling)"
            value={data.ceilingHeight}
            onChange={v => updateData({ ceilingHeight: v, envelope: null })}
            units={units}
          />
        </CardSection>

        <CardSection
          title="Construction era"
          hint="This sets default insulation levels for your home. You can fine-tune them in the next step."
        >
          <SelectField
            label="When was the home built (or last major renovation)?"
            value={data.era}
            onChange={handleEraChange}
            options={constructionEras}
          />
        </CardSection>
      </Card>
    </div>
  )
}
