export default function Button({ children, onClick, variant = 'primary', type = 'button', disabled = false, className = '' }) {
  const base = 'inline-flex min-h-11 items-center justify-center rounded-full px-6 py-2.5 font-semibold transition-colors'
  const variants = {
    primary: 'bg-glacier text-on-glacier hover:opacity-90 disabled:opacity-50',
    outline: 'border-2 border-hairline text-basalt bg-transparent hover:bg-snowfield',
    ghost:   'text-glacier underline hover:bg-snowfield',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
