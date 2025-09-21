import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initializeFrontendLogger } from './utils/frontendLogger'

// Initialize frontend logging FIRST
initializeFrontendLogger()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)