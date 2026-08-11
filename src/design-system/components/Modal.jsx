import { useEffect, useRef } from 'react'
export function Modal({ title, children, footer, onClose }) {
  const dialogRef = useRef(null)
  useEffect(() => {
    const previouslyFocused = document.activeElement
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusFrame = window.requestAnimationFrame(() => dialogRef.current?.focus())
    const handleKey = (event) => { if (event.key === 'Escape') onClose() }
    if (onClose) document.addEventListener('keydown', handleKey)
    return () => { window.cancelAnimationFrame(focusFrame); document.body.style.overflow = previous; document.removeEventListener('keydown', handleKey); if (previouslyFocused?.isConnected) previouslyFocused.focus() }
  }, [onClose])
  return (
    <div className="ds-modal-backdrop" onMouseDown={(event) => { if (onClose && event.target === event.currentTarget) onClose() }}>
      <div ref={dialogRef} className="ds-modal" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <div className="ds-modal-header">
          <h3>{title}</h3>
        </div>
        <div className="ds-modal-body">{children}</div>
        {footer ? <div className="ds-modal-footer">{footer}</div> : null}
      </div>
    </div>
  )
}
