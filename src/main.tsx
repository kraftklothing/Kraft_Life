import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import PinGate from './PinGate'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PinGate>
      {(initialState, cloudSync) => (
        <App initialState={initialState} cloudSync={cloudSync} />
      )}
    </PinGate>
  </StrictMode>,
)
