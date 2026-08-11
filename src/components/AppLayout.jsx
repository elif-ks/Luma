import { Outlet } from 'react-router-dom'
import { Layout, TopNav, Sidebar } from './Layout'
import { RightRail } from './RightRail'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { subscribeToUsers } from '../services/users'
import { subscribeToPublicPosts } from '../services/posts'
import { useSafety } from '../context/SafetyContext'

export function AppLayout() {
  const { user } = useAuth()
  const { blockedUids, mutedUids } = useSafety()
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [posts, setPosts] = useState([])
  useEffect(() => subscribeToUsers((items) => { setUsers(items.filter((item) => item.uid !== user?.uid)); setUsersLoading(false) }, () => { setUsers([]); setUsersLoading(false) }), [user?.uid])
  useEffect(() => subscribeToPublicPosts(setPosts, () => setPosts([]), 50), [])
  return (
    <Layout>
      <TopNav />

      <div className="main-grid">
        <Sidebar />

        <main className="content-area">
          <Outlet />
        </main>

        <RightRail users={users.filter((item)=>!blockedUids.has(item.uid)&&!mutedUids.has(item.uid))} loading={usersLoading} posts={posts.filter((item)=>!blockedUids.has(item.ownerUid)&&!mutedUids.has(item.ownerUid))} />
      </div>
    </Layout>
  )
}
