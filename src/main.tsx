import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { CloudSyncProvider } from './CloudSyncProvider'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CloudSyncProvider>
      <App />
    </CloudSyncProvider>
  </StrictMode>,
)
