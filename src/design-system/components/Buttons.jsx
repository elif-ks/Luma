export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button className={`ds-btn ds-btn-primary ${className}`.trim()} {...props}>
      {children}
    </button>
  )
}

export function SecondaryButton({ children, className = '', ...props }) {
  return (
    <button className={`ds-btn ds-btn-secondary ${className}`.trim()} {...props}>
      {children}
    </button>
  )
}

export function GhostButton({ children, className = '', ...props }) {
  return (
    <button className={`ds-btn ds-btn-ghost ${className}`.trim()} {...props}>
      {children}
    </button>
  )
}

export function IconButton({ children, className = '', ...props }) {
  return (
    <button className={`ds-btn ds-btn-icon ${className}`.trim()} {...props}>
      {children}
    </button>
  )
}
