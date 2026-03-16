import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppMobile from './AppMobile.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppMobile />
  </StrictMode>,
)
