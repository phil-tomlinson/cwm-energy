export default function Button({ children, onClick, variant = 'primary', type = 'button', disabled = false, className = '' }) {
  const base = 'inline-flex items-center px-5 py-2.5 rounded-lg font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2'
  const variants = {
    primary:  'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 disabled:bg-emerald-300',
    outline:  'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-emerald-500',
    ghost:    'text-gray-600 hover:bg-gray-100 focus:ring-gray-400',
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
