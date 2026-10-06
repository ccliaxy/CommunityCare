// import { useEffect, useId, useRef, useState } from 'react'
// import type { FormEvent, ReactNode } from 'react'
// import './LoginPage.css'

// type IconName = 'mail' | 'lock' | 'eye' | 'eye-off' | 'login'
// function Icon({ name }: { name: IconName }) {
//   const paths: Record<IconName, ReactNode> = {
//     mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
//     lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
//     eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
//     'eye-off': <><path d="m3 3 18 18M10.6 5.1 1.4-.1c6.5 0 10 7 10 7a20 20 0 0 1-3 3.8M6.3 6.3A21 21 0 0 0 2 12s3.5 7 10 7a12 12 0 0 0 5.7-1.6M10 10a3 3 0 0 0 4 4" /></>,
//     login: <><path d="M14 4h5v16h-5M3 12h12m-4-4 4 4-4 4" /></>,
//   }
//   return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
// }

// type InfoPanel = 'forgot' | 'help' | 'privacy' | null
// function InfoDialog({ panel, onClose }: { panel: Exclude<InfoPanel, null>; onClose: () => void }) {
//   const dialog = useRef<HTMLDialogElement>(null)
//   const titleId = useId()
//   useEffect(() => {
//     const element = dialog.current
//     element?.showModal()
//     return () => element?.close()
//   }, [])
//   const content = {
//     forgot: ['Reset your password', 'Password reset will be available when authentication is connected. No reset email has been sent. For now, this page previews the login form only.'],
//     help: ['Portal help', 'This portal is intended for authorised property staff and system administrators. Your account will be provided by the authorised administrator. This preview does not validate accounts or open a dashboard.'],
//     privacy: ['Privacy information', 'This UI preview does not send your form entries to a server or save your password in browser storage. Use sample credentials while testing. The full privacy notice will be added before real account data is collected.'],
//   }[panel]
//   return <dialog ref={dialog} className="cc-dialog" aria-labelledby={titleId} onCancel={onClose}>
//     <h2 id={titleId}>{content[0]}</h2>
//     <p>{content[1]}</p>
//     <button autoFocus className="cc-primary" type="button" onClick={onClose}>Got it</button>
//   </dialog>
// }

// export default function LoginPage() {
//   const [email, setEmail] = useState('')
//   const [password, setPassword] = useState('')
//   const [remember, setRemember] = useState(false)
//   const [showPassword, setShowPassword] = useState(false)
//   const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
//   const [notice, setNotice] = useState('')
//   const [panel, setPanel] = useState<InfoPanel>(null)
//   const emailInput = useRef<HTMLInputElement>(null)
//   const passwordInput = useRef<HTMLInputElement>(null)

//   function submit(event: FormEvent<HTMLFormElement>) {
//     event.preventDefault()
//     const next: typeof errors = {}
//     if (!email.trim()) next.email = 'Please enter your email address.'
//     else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Enter an email such as staff@example.com.'
//     if (password.length === 0) next.password = 'Please enter your password.'
//     setErrors(next)
//     setNotice('')
//     if (next.email) { emailInput.current?.focus(); return }
//     if (next.password) { passwordInput.current?.focus(); return }
//     // UI preview only. Later, authenticate and authorise the returned role here.
//     // Do not trim passwords, store them locally, or infer roles from email text.
//     setNotice('Form checked. Login is not connected yet, so no account has been authenticated. Your password has not been sent or saved.')
//   }

//   return <main className="cc-login">
//     <section className="cc-brand-panel" aria-labelledby="cc-welcome">
//       <div className="cc-brand-content">
//         <div className="cc-brand">
//           <img src={`${import.meta.env.BASE_URL}communitycare-logo.png`} alt="" width="48" height="48" />
//           <span>CommunityCare System</span>
//         </div>
//         <div className="cc-welcome">
//           <span className="cc-eyebrow">CONNECTED CARE. SHARED PEACE OF MIND.</span>
//           <h1 id="cc-welcome">Welcome Back</h1>
//           <p>Manage properties, support your residents, and keep your community connected through one centralised portal.</p>
//         </div>
//       </div>
//       <p className="cc-brand-footer">Staff &amp; Administrator Portal</p>
//     </section>

//     <section className="cc-form-panel" aria-labelledby="cc-login-title">
//       <div className="cc-form-container">
//         <header className="cc-form-header">
//           <p className="cc-preview-label">UI PREVIEW</p>
//           <h2 id="cc-login-title">Staff &amp; Admin Portal Login</h2>
//           <p>Please enter your credentials to access the management dashboard.</p>
//         </header>

//         <form noValidate onSubmit={submit} className="cc-form">
//           <div className="cc-field">
//             <label htmlFor="cc-email">Email</label>
//             <div className="cc-input-wrap">
//               <span className="cc-input-icon"><Icon name="mail" /></span>
//               <input ref={emailInput} id="cc-email" name="email" type="email" autoComplete="username"
//                 autoCapitalize="none" spellCheck={false} value={email}
//                 onChange={(event) => { setEmail(event.target.value); setErrors((old) => ({ ...old, email: undefined })); setNotice('') }}
//                 placeholder="e.g. staff@communitycare.com" aria-invalid={Boolean(errors.email)}
//                 aria-describedby={errors.email ? 'cc-email-error' : undefined} />
//             </div>
//             {errors.email && <p className="cc-error" id="cc-email-error">{errors.email}</p>}
//           </div>

//           <div className="cc-field">
//             <div className="cc-label-row">
//               <label htmlFor="cc-password">Password</label>
//               <button className="cc-text-button" type="button" onClick={() => setPanel('forgot')}>Forgot Password?</button>
//             </div>
//             <div className="cc-input-wrap">
//               <span className="cc-input-icon"><Icon name="lock" /></span>
//               <input ref={passwordInput} className="cc-password" id="cc-password" name="password"
//                 type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password}
//                 onChange={(event) => { setPassword(event.target.value); setErrors((old) => ({ ...old, password: undefined })); setNotice('') }}
//                 placeholder="Enter your password" aria-invalid={Boolean(errors.password)}
//                 aria-describedby={errors.password ? 'cc-password-error' : undefined} />
//               <button className="cc-password-toggle" type="button"
//                 aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}
//                 onClick={() => setShowPassword((visible) => !visible)}>
//                 <Icon name={showPassword ? 'eye-off' : 'eye'} />
//               </button>
//             </div>
//             {errors.password && <p className="cc-error" id="cc-password-error">{errors.password}</p>}
//           </div>

//           <div>
//             <label className="cc-checkbox">
//               <input name="remember" type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} aria-describedby="cc-remember-note" />
//               <span>Keep me logged in on this device</span>
//             </label>
//             <p id="cc-remember-note" className="cc-field-note">Preview only — session persistence is not connected.</p>
//           </div>
//           <button className="cc-primary cc-login-button" type="submit"><Icon name="login" /><span>Login to Dashboard</span></button>
//           <div aria-live="polite" aria-atomic="true">{notice && <p className="cc-notice" role="status">{notice}</p>}</div>
//         </form>

//         <footer className="cc-footer">
//           <p>Property Management Portal © {new Date().getFullYear()}</p>
//           <nav aria-label="Portal information">
//             <button className="cc-text-button" type="button" onClick={() => setPanel('help')}>Help</button>
//             <button className="cc-text-button" type="button" onClick={() => setPanel('privacy')}>Privacy</button>
//           </nav>
//         </footer>
//       </div>
//     </section>
//     {panel && <InfoDialog panel={panel} onClose={() => setPanel(null)} />}
//   </main>
// }

import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import './LoginPage.css'

type IconName = 'mail' | 'lock' | 'eye' | 'eye-off' | 'login'
function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    'eye-off': <><path d="m3 3 18 18M10.6 5.1 1.4-.1c6.5 0 10 7 10 7a20 20 0 0 1-3 3.8M6.3 6.3A21 21 0 0 0 2 12s3.5 7 10 7a12 12 0 0 0 5.7-1.6M10 10a3 3 0 0 0 4 4" /></>,
    login: <><path d="M14 4h5v16h-5M3 12h12m-4-4 4 4-4 4" /></>,
  }
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

type InfoPanel = 'forgot' | 'help' | 'privacy' | null
function InfoDialog({ panel, onClose }: { panel: Exclude<InfoPanel, null>; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])
  const content = {
    forgot: ['Reset your password', 'Self-service password reset is not connected yet. Contact your administrator for help. No reset email has been sent.'],
    help: ['Portal help', 'This portal is intended for authorised property staff and system administrators. Your account will be provided by the authorised administrator. Use your CommunityCare account email and password to sign in.'],
    privacy: ['Privacy information', 'Your credentials are sent to Supabase Auth to verify your login. This app stores session tokens in this browser tab, not your password. Sign out on shared devices. A full privacy notice is still to be added.'],
  }[panel]
  return <dialog ref={dialog} className="cc-dialog" aria-labelledby={titleId} onCancel={onClose}>
    <h2 id={titleId}>{content[0]}</h2>
    <p>{content[1]}</p>
    <button autoFocus className="cc-primary" type="button" onClick={onClose}>Got it</button>
  </dialog>
}

type LoginPageProps = { onSignIn: (email: string, password: string) => Promise<void>; busy: boolean; authError: string }
export default function LoginPage({ onSignIn, busy, authError }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [notice, setNotice] = useState('')
  const [panel, setPanel] = useState<InfoPanel>(null)
  const emailInput = useRef<HTMLInputElement>(null)
  const passwordInput = useRef<HTMLInputElement>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const next: typeof errors = {}
    if (!email.trim()) next.email = 'Please enter your email address.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Enter an email such as staff@example.com.'
    if (password.length === 0) next.password = 'Please enter your password.'
    setErrors(next)
    setNotice('')
    if (next.email) { emailInput.current?.focus(); return }
    if (next.password) { passwordInput.current?.focus(); return }
    await onSignIn(email.trim(), password)

  }

  return <main className="cc-login">
    <section className="cc-brand-panel" aria-labelledby="cc-welcome">
      <div className="cc-brand-content">
        <div className="cc-brand">
          <img src={`${import.meta.env.BASE_URL}communitycare-logo.png`} alt="" width="48" height="48" />
          <span>CommunityCare System</span>
        </div>
        <div className="cc-welcome">
          <span className="cc-eyebrow">CONNECTED CARE. SHARED PEACE OF MIND.</span>
          <h1 id="cc-welcome">Welcome Back</h1>
          <p>Manage properties, support your residents, and keep your community connected through one centralised portal.</p>
        </div>
      </div>
      <p className="cc-brand-footer">Staff &amp; Administrator Portal</p>
    </section>

    <section className="cc-form-panel" aria-labelledby="cc-login-title">
      <div className="cc-form-container">
        <header className="cc-form-header">
          <p className="cc-preview-label">ACCOUNT LOGIN</p>
          <h2 id="cc-login-title">Staff &amp; Admin Portal Login</h2>
          <p>Please enter your credentials to access the management dashboard.</p>
        </header>

        <form noValidate onSubmit={submit} className="cc-form">
          <div className="cc-field">
            <label htmlFor="cc-email">Email</label>
            <div className="cc-input-wrap">
              <span className="cc-input-icon"><Icon name="mail" /></span>
              <input ref={emailInput} id="cc-email" name="email" type="email" disabled={busy} autoComplete="username"
                autoCapitalize="none" spellCheck={false} value={email}
                onChange={(event) => { setEmail(event.target.value); setErrors((old) => ({ ...old, email: undefined })); setNotice('') }}
                placeholder="e.g. staff@communitycare.com" aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'cc-email-error' : undefined} />
            </div>
            {errors.email && <p className="cc-error" id="cc-email-error">{errors.email}</p>}
          </div>

          <div className="cc-field">
            <div className="cc-label-row">
              <label htmlFor="cc-password">Password</label>
              <button className="cc-text-button" type="button" onClick={() => setPanel('forgot')}>Forgot Password?</button>
            </div>
            <div className="cc-input-wrap">
              <span className="cc-input-icon"><Icon name="lock" /></span>
              <input ref={passwordInput} className="cc-password" id="cc-password" name="password" disabled={busy}
                type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password}
                onChange={(event) => { setPassword(event.target.value); setErrors((old) => ({ ...old, password: undefined })); setNotice('') }}
                placeholder="Enter your password" aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'cc-password-error' : undefined} />
              <button className="cc-password-toggle" type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}>
                <Icon name={showPassword ? 'eye-off' : 'eye'} />
              </button>
            </div>
            {errors.password && <p className="cc-error" id="cc-password-error">{errors.password}</p>}
          </div>

          <p className="cc-field-note">Your session survives refresh in this tab. Sign out when finished on a shared device.</p>
          <button className="cc-primary cc-login-button" type="submit" disabled={busy} aria-busy={busy}><Icon name="login" /><span>{busy ? 'Signing in…' : 'Login to Dashboard'}</span></button>
          <div aria-live="polite" aria-atomic="true">{authError && <p className="cc-error" role="alert">{authError}</p>}{notice && <p className="cc-notice" role="status">{notice}</p>}</div>
        </form>

        <footer className="cc-footer">
          <p>Property Management Portal © {new Date().getFullYear()}</p>
          <nav aria-label="Portal information">
            <button className="cc-text-button" type="button" onClick={() => setPanel('help')}>Help</button>
            <button className="cc-text-button" type="button" onClick={() => setPanel('privacy')}>Privacy</button>
          </nav>
        </footer>
      </div>
    </section>
    {panel && <InfoDialog panel={panel} onClose={() => setPanel(null)} />}
  </main>
}
