export default function Button({ children, onClick, variant = 'primary', type = 'button', disabled = false, className = '' }) {
  const base = 'inline-flex items-center px-5 py-2.5 font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900'
  const variants = {
    primary: 'bg-emerald-400 text-zinc-950 hover:bg-emerald-300 focus:ring-emerald-400 disabled:bg-emerald-800 disabled:text-zinc-600',
    outline: 'border border-zinc-600 text-zinc-300 bg-transparent hover:bg-zinc-800 hover:border-zinc-400 focus:ring-zinc-500',
    ghost:   'text-zinc-400 hover:bg-zinc-800 focus:ring-zinc-500',
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
