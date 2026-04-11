import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ControlView } from './ControlView.tsx'
import './index.css'

import { GoogleOAuthProvider } from '@react-oauth/google'

const GOOGLE_CLIENT_ID = "<TU_GOOGLE_CLIENT_ID>";

const currentPath = window.location.pathname;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {currentPath === '/control' ? <ControlView /> : <App />}
    </GoogleOAuthProvider>
  </React.StrictMode>,
)
