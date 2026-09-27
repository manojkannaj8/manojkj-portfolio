import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/michroma/400.css'
import '@fontsource-variable/unbounded'
import '@fontsource-variable/manrope'
import './styles/global.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
