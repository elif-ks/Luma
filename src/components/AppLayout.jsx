import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Layout, TopNav, Sidebar } from './Layout'
import { RightRail } from './RightRail'
import { useAuth } from '../context/AuthContext'
import { subscribeToUsers } from '../services/users'
import { subscribeToPublicPosts } from '../services/posts'
import { useSafety } from '../context/SafetyContext'

export function AppLayout() {
  const location = useLocation()
  const { user } = useAuth()
  const { blockedUids, mutedUids } = useSafety()
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [posts, setPosts] = useState([])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const closeButtonRef = useRef(null)
  useEffect(() => subscribeToUsers((items) => { setUsers(items.filter((item) => item.uid !== user?.uid)); setUsersLoading(false) }, () => { setUsers([]); setUsersLoading(false) }), [user?.uid])
  useEffect(() => subscribeToPublicPosts(setPosts, () => setPosts([]), 50), [])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.key])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1101px)')
    const closeOnDesktop = (event) => {
      if (event.matches) setMobileMenuOpen(false)
    }

    mediaQuery.addEventListener('change', closeOnDesktop)
    return () => mediaQuery.removeEventListener('change', closeOnDesktop)
  }, [])

  useEffect(() => {
    if (!mobileMenuOpen) return undefined

    const previousOverflow = document.body.style.overflow
    const handleEscape = (event) => {
      if (event.key === 'Escape') setMobileMenuOpen(false)
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleEscape)
    closeButtonRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleEscape)
    }
  }, [mobileMenuOpen])

  return (
    <Layout>
      <TopNav onMenuOpen={() => setMobileMenuOpen(true)} mobileMenuOpen={mobileMenuOpen} />

      {mobileMenuOpen ? (
        <div className="mobile-nav-layer">
          <button
            type="button"
            className="mobile-nav-overlay"
            aria-label="Menüyü kapat"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside id="mobile-navigation" className="mobile-nav-drawer" aria-label="Mobil navigasyon">
            <div className="mobile-nav-drawer__header">
              <strong>Menü</strong>
              <button
                ref={closeButtonRef}
                type="button"
                className="mobile-nav-close"
                aria-label="Menüyü kapat"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <Sidebar variant="mobile" onNavigate={() => setMobileMenuOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="main-grid">
        <Sidebar variant="desktop" />

        <main className="content-area">
          <Outlet />
        </main>

        <RightRail users={users.filter((item)=>!blockedUids.has(item.uid)&&!mutedUids.has(item.uid))} loading={usersLoading} posts={posts.filter((item)=>!blockedUids.has(item.ownerUid)&&!mutedUids.has(item.ownerUid))} />
      </div>
    </Layout>
  )
}
