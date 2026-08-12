import { render } from 'preact'
import './index.css'
import './design-system/index.css'
import { App } from './app.jsx'
import { AppErrorBoundary } from './components/shared/AppErrorBoundary.jsx'

render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>,
  document.getElementById('app'),
)
