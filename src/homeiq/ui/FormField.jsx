import { displayArea, displayLength, inputArea, inputLength, areaUnit, lengthUnit } from '../../utils/units'

const inputClass = 'w-full bg-snowfield border border-hairline text-basalt px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-glacier focus:border-transparent placeholder-scree'
const selectClass = 'w-full bg-snowfield border border-hairline text-basalt px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-glacier focus:border-transparent'

// A labeled form field with optional help text and "default" badge.
export default function FormField({ label, hint, defaultNote, children, className = '' }) {
  return (
    <div className={`mb-4 ${className}`}>
      <div className="flex items-baseline justify-between mb-1">
        <label className="block text-[15px] font-semibold text-basalt">{label}</label>
        {defaultNote && (
          <span className="text-[13px] text-glacier bg-glacier/10 border border-glacier px-2 py-0.5 tabular-nums">
            default: {defaultNote}
          </span>
        )}
      </div>
      {children}
      {hint && <p className="mt-1 text-[13px] text-scree">{hint}</p>}
    </div>
  )
}

export function SelectField({ label, hint, defaultNote, value, onChange, options, className = '' }) {
  return (
    <FormField label={label} hint={hint} defaultNote={defaultNote} className={className}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={selectClass}
      >
        {options.map(opt => (
          <option key={opt.value ?? opt} value={opt.value ?? opt} className="bg-snowfield text-basalt">
            {opt.label ?? opt}
          </option>
        ))}
      </select>
    </FormField>
  )
}

export function NumberField({ label, hint, defaultNote, value, onChange, min, max, step = 1, unit, className = '' }) {
  return (
    <FormField label={label} hint={hint} defaultNote={defaultNote} className={className}>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          className={inputClass}
        />
        {unit && <span className="text-sm text-scree whitespace-nowrap tabular-nums">{unit}</span>}
      </div>
    </FormField>
  )
}

// Area field — value prop and onChange are always in m². Displays in selected unit system.
export function AreaField({ label, hint, defaultNote, value, onChange, units = 'metric', className = '' }) {
  const displayed = displayArea(value, units)
  const unit = areaUnit(units)
  const step = units === 'imperial' ? 5 : 0.5
  return (
    <NumberField
      label={label} hint={hint} defaultNote={defaultNote}
      value={displayed}
      onChange={v => onChange(inputArea(v, units))}
      min={0} step={step} unit={unit}
      className={className}
    />
  )
}

// Length field — value prop and onChange are always in metres. Displays in selected unit system.
export function LengthField({ label, hint, defaultNote, value, onChange, units = 'metric', className = '' }) {
  const displayed = displayLength(value, units)
  const unit = lengthUnit(units)
  const step = units === 'imperial' ? 0.5 : 0.05
  return (
    <NumberField
      label={label} hint={hint} defaultNote={defaultNote}
      value={displayed}
      onChange={v => onChange(inputLength(v, units))}
      min={0} step={step} unit={unit}
      className={className}
    />
  )
}
