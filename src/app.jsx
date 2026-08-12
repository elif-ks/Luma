import './app.css'
import './components/movie/movieDetail.css'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { PageLoadingFallback } from './components/shared/PageLoadingFallback'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SafetyProvider } from './context/SafetyContext'
import { NotificationProvider } from './context/NotificationContext'

const lazyPage = (loader, exportName) => lazy(() => loader().then((module) => ({ default: module[exportName] })))

const HomePage = lazyPage(() => import('./pages/HomePage'), 'HomePage')
const DiscoverPage = lazyPage(() => import('./components/discover/DiscoverPage'), 'DiscoverPage')
const ProfilePage = lazyPage(() => import('./components/profile/ProfilePage'), 'ProfilePage')
const MovieDetailPage = lazyPage(() => import('./components/movie/MovieDetailPage'), 'MovieDetailPage')
const TVDetailPage = lazyPage(() => import('./components/tv/TVDetailPage'), 'TVDetailPage')
const ReviewsPage = lazyPage(() => import('./pages/ReviewsPage'), 'ReviewsPage')
const ReviewDetailPage = lazyPage(() => import('./pages/ReviewDetailPage'), 'ReviewDetailPage')
const ListsPage = lazyPage(() => import('./pages/ListsPage'), 'ListsPage')
const ListDetailPage = lazyPage(() => import('./pages/ListDetailPage'), 'ListDetailPage')
const DiaryPage = lazyPage(() => import('./pages/DiaryPage'), 'DiaryPage')
const LoginPage = lazyPage(() => import('./pages/LoginPage'), 'LoginPage')
const RegisterPage = lazyPage(() => import('./pages/RegisterPage'), 'RegisterPage')
const ForgotPasswordPage = lazyPage(() => import('./pages/ForgotPasswordPage'), 'ForgotPasswordPage')
const NotFoundPage = lazyPage(() => import('./pages/NotFoundPage'), 'NotFoundPage')
const GenrePage = lazyPage(() => import('./pages/GenrePage'), 'GenrePage')
const SearchResultsPage = lazyPage(() => import('./pages/SearchResultsPage'), 'SearchResultsPage')
const FeedPage = lazyPage(() => import('./pages/FeedPage'), 'FeedPage')
const PostDetailPage = lazyPage(() => import('./pages/PostDetailPage'), 'PostDetailPage')
const HashtagPage = lazyPage(() => import('./pages/HashtagPage'), 'HashtagPage')
const PublicProfilePage = lazyPage(() => import('./pages/PublicProfileWithActivityPage'), 'PublicProfileWithActivityPage')
const LegacyUserProfileRedirect = lazyPage(() => import('./pages/PublicProfilePage'), 'LegacyUserProfileRedirect')
const MessagesPage = lazyPage(() => import('./pages/MessagesPage'), 'MessagesPage')
const PeoplePage = lazyPage(() => import('./pages/PeoplePage'), 'PeoplePage')
const SettingsPage = lazyPage(() => import('./pages/SettingsPage'), 'SettingsPage')
const ForYouPage = lazyPage(() => import('./pages/ForYouPage'), 'ForYouPage')
const ActivityPage = lazyPage(() => import('./pages/ActivityPage'), 'ActivityPage')
const NotificationsPage = lazyPage(() => import('./pages/NotificationsPage'), 'NotificationsPage')
const CommunitiesPage = lazyPage(() => import('./pages/CommunitiesPage'), 'CommunitiesPage')
const CommunityCreatePage = lazyPage(() => import('./pages/CommunityCreatePage'), 'CommunityCreatePage')
const CommunityDetailPage = lazyPage(() => import('./pages/CommunityDetailPage'), 'CommunityDetailPage')
const CommunityPostDetailPage = lazyPage(() => import('./pages/CommunityPostDetailPage'), 'CommunityPostDetailPage')
const CommunitySettingsPage = lazyPage(() => import('./pages/CommunitySettingsPage'), 'CommunitySettingsPage')

function GuestOnlyRoute() {
  const { user, authLoading } = useAuth()

  if (authLoading) return <PageLoadingFallback message="Oturum kontrol ediliyor…" />
  if (user) return <Navigate to="/" replace />

  return <Outlet />
}

function ProfileRoute() {
  const { user, authLoading } = useAuth()

  if (authLoading) return <PageLoadingFallback message="Oturum kontrol ediliyor…" />
  if (!user) return <Navigate to="/login" replace />

  return <Outlet />
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <SafetyProvider>
          <NotificationProvider>
            <Suspense fallback={<PageLoadingFallback />}>
              <Routes>
                <Route element={<GuestOnlyRoute />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                </Route>

                <Route element={<AppLayout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/discover" element={<DiscoverPage />} />
                  <Route path="/for-you" element={<ForYouPage />} />
                  <Route path="/activity" element={<ActivityPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/communities" element={<CommunitiesPage />} />
                  <Route path="/communities/new" element={<CommunityCreatePage />} />
                  <Route path="/communities/:communityId" element={<CommunityDetailPage />} />
                  <Route path="/communities/:communityId/posts/:postId" element={<CommunityPostDetailPage />} />
                  <Route path="/communities/:communityId/settings" element={<CommunitySettingsPage />} />
                  <Route path="/movie/:id" element={<MovieDetailPage />} />
                  <Route path="/tv/:id" element={<TVDetailPage />} />
                  <Route path="/genre/:slug" element={<GenrePage />} />
                  <Route path="/search" element={<SearchResultsPage />} />
                  <Route path="/feed" element={<FeedPage />} />
                  <Route path="/post/:id" element={<PostDetailPage />} />
                  <Route path="/hashtag/:tag" element={<HashtagPage />} />
                  <Route path="/messages" element={<MessagesPage />} />
                  <Route path="/messages/:conversationId" element={<MessagesPage />} />
                  <Route path="/people" element={<PeoplePage />} />
                  <Route path="/user/:uid" element={<LegacyUserProfileRedirect />} />
                  <Route path="/profile/:username" element={<PublicProfilePage />} />
                  <Route element={<ProfileRoute />}>
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Route>
                  <Route path="/reviews" element={<ReviewsPage />} />
                  <Route path="/reviews/:id" element={<ReviewDetailPage />} />
                  <Route path="/lists" element={<ListsPage />} />
                  <Route path="/lists/:id" element={<ListDetailPage />} />
                  <Route path="/diary" element={<DiaryPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </Suspense>
          </NotificationProvider>
        </SafetyProvider>
      </BrowserRouter>
    </AuthProvider>
  )
}
