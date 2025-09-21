import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initializeFrontendLogger } from './helpers/frontendLogger'

// Käynnistä frontend logging heti
initializeFrontendLogger()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
