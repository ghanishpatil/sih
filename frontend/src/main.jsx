import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { EventProvider } from './context/EventContext.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import { SmoothScroll } from './components/SmoothScroll.jsx'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <EventProvider>
            <SmoothScroll>
              <App />
            </SmoothScroll>
          </EventProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)

