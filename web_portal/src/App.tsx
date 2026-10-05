import { useState } from 'react'
import LoginPage from './pages/LoginPage'
import StaffPortal from './pages/staff/StaffPortal'

export default function App() {
  const [preview, setPreview] = useState(false)
  return preview ? <StaffPortal onLogout={() => { setPreview(false); window.scrollTo(0, 0) }} /> : <><div className="sd-preview-entry"><span>Frontend preview · Authentication is not connected</span><button onClick={() => setPreview(true)}>Open Staff Dashboard preview</button></div><LoginPage /></>
}
