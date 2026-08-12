import { useEffect, useRef, useState } from 'react'

const MENU_OPEN_EVENT = 'luma:post-actions-open'

export function PostActionsMenu({ id, label = 'Gönderi işlemleri', actions = [] }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const menuId = `post-actions-${id}`

  useEffect(() => {
    const closeOtherMenu = (event) => {
      if (event.detail !== menuId) setOpen(false)
    }
    window.addEventListener(MENU_OPEN_EVENT, closeOtherMenu)
    return () => window.removeEventListener(MENU_OPEN_EVENT, closeOtherMenu)
  }, [menuId])

  useEffect(() => {
    if (!open) return undefined
    const closeOutside = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false)
    }
    const closeEscape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', closeOutside)
    document.addEventListener('keydown', closeEscape)
    return () => {
      document.removeEventListener('mousedown', closeOutside)
      document.removeEventListener('keydown', closeEscape)
    }
  }, [open])

  if (!actions.length) return null

  const toggle = (event) => {
    event.preventDefault()
    event.stopPropagation()
    setOpen((current) => {
      const next = !current
      if (next) window.dispatchEvent(new CustomEvent(MENU_OPEN_EVENT, { detail: menuId }))
      return next
    })
  }

  return (
    <div className="post-actions-menu" ref={wrapRef} onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        className="post-actions-menu__trigger"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={toggle}
      >
        <span aria-hidden="true">•••</span>
      </button>
      {open ? (
        <div id={menuId} className="post-actions-menu__popover" role="menu">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              role="menuitem"
              className={action.danger ? 'danger' : ''}
              disabled={action.disabled}
              onClick={(event) => {
                event.stopPropagation()
                setOpen(false)
                action.onSelect()
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
