import { Modal } from './PortalUI'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../../lib/backendApi'
import './StaffProfilePage.css'

type Membership = { id: string; property_name: string; address: string; time_zone: string; staff_kind: string; starts_at: string; ends_at: string | null; active: boolean }
type Profile = { id: string; full_name: string; phone_number: string | null; email: string; role: string; status: string; created_at: string; version: string; memberships: Membership[] }
function phoneValidation(value: string) {
  const phone = value.trim()
  if (!phone) return ''
  if (!/^\+?[0-9 ()-]*$/.test(phone)) return 'Use numbers only, with an optional + at the start, spaces, brackets or hyphens. Letters are not allowed.'
  const digits = phone.replace(/\D/g, '').length
  if (digits < 6 || digits > 15 || phone.length > 30) return 'Enter a contact number with 6–15 digits, or leave this field blank.'
  return ''
}
const explain = (e: unknown) => e instanceof Error ? e.message : 'Unable to load your profile.'
const date = (s: string) => new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'Asia/Kuala_Lumpur' }).format(new Date(s))
export default function StaffProfilePage({ onBack, onEditingChange }: { onBack: () => void; onEditingChange: (dirty: boolean, busy: boolean) => void }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [name, setName] = useState(''), [phone, setPhone] = useState('')
  const [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [reload, setReload] = useState(0)
  const [discardAction, setDiscardAction] = useState<'back' | 'reload' | null>(null)
  const phoneInput = useRef<HTMLInputElement>(null)
  const phoneError = phoneValidation(phone)
  const alive = useRef(false), savingRef = useRef(false)
  const dirty = !!profile && (name !== profile.full_name || phone !== (profile.phone_number ?? ''))
  useEffect(() => { onEditingChange(dirty, saving); return () => onEditingChange(false, false) }, [dirty, saving, onEditingChange])
  function populate(p: Profile) { setProfile(p); setName(p.full_name); setPhone(p.phone_number ?? '') }
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('')
    api<Profile>('/staff/profile', { signal: controller.signal }).then(p => { if (!controller.signal.aborted) populate(p) })
      .catch(e => { if (!controller.signal.aborted) setError(explain(e)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [reload])
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  function performDiscard(action: 'back' | 'reload') {
    setDiscardAction(null)
    if (action === 'back') onBack()
    else { setNotice(''); setReload(v => v + 1) }
  }
  function requestDiscard(action: 'back' | 'reload') {
    if (dirty) setDiscardAction(action)
    else performDiscard(action)
  }
  async function save(e: FormEvent) {
    e.preventDefault(); if (!profile || savingRef.current) return
    if (phoneError) { phoneInput.current?.focus(); return }
    savingRef.current = true; setSaving(true); setError(''); setNotice('')
    try {
      const next = await api<Profile>('/staff/profile', { method: 'PATCH', body: JSON.stringify({ full_name: name, phone_number: phone, version: profile.version }) })
      // Notify even if the user left this page while the request was finishing.
      window.dispatchEvent(new Event('communitycare:profile-changed'))
      if (alive.current) { populate(next); setNotice('Your profile has been saved.') }
    } catch (e) { if (alive.current) setError(explain(e)) }
    finally { savingRef.current = false; if (alive.current) setSaving(false) }
  }
  const active = profile?.memberships.filter(m => m.active) ?? []
  return <main className="sp-profile">
    <div className="sp-page-heading"><div><p className="sp-eyebrow">MY ACCOUNT</p><h2>My Profile</h2><p>Keep your personal details up to date.</p></div><button className="sp-secondary" disabled={saving} onClick={() => requestDiscard('back')}>← Back</button></div>
    {loading && !profile && <div className="sp-card" role="status">Loading your profile…</div>}
    {error && <div className="sp-feedback sp-error" role="alert"><p>{error}</p><button disabled={saving || loading} onClick={() => requestDiscard('reload')}>Reload saved profile</button></div>}
    {notice && <p className="sp-feedback sp-success" role="status">{notice}</p>}
    {profile && <div className="sp-layout"><aside className="sp-card sp-summary">
      <div className="sp-avatar" aria-hidden="true">{profile.full_name.split(/\s+/).filter(Boolean).slice(0, 2).map(n => Array.from(n)[0]).join('').toUpperCase()}</div>
      <h3>{profile.full_name}</h3><p className="sp-email">{profile.email}</p><span className="sp-badge">Active account</span>
      <dl><div><dt>Portal</dt><dd>Property Staff</dd></div><div><dt>Active properties</dt><dd>{active.length}</dd></div><div><dt>Member since</dt><dd>{date(profile.created_at)}</dd></div></dl>
      <p className="sp-note">Your permissions are assigned separately for each property.</p>
    </aside><div className="sp-content">
      <section className="sp-card"><div className="sp-section-heading"><h3>Personal Information</h3><span className="sp-muted">Only visible contact details are editable</span></div>
        <form onSubmit={save}><fieldset disabled={saving || loading} className="sp-fields"><div className="sp-form-grid">
          <label>Full name<input autoComplete="name" value={name} onChange={e => { setName(e.target.value); setNotice('') }} required maxLength={120} /></label>
          <label htmlFor="sp-contact-phone">Contact phone <span className="sp-optional">(optional)</span>{phoneError && <span id="sp-phone-error" className="sp-field-error" aria-live="polite">{phoneError}</span>}<input id="sp-contact-phone" ref={phoneInput} type="tel" inputMode="tel" autoComplete="tel" value={phone} aria-invalid={!!phoneError} aria-describedby={phoneError ? 'sp-phone-error sp-phone-help' : 'sp-phone-help'} onChange={e => { setPhone(e.target.value); setNotice('') }} maxLength={30} placeholder="e.g. +60 12-345 6789" /><small id="sp-phone-help">This is a contact number, not your login phone.</small></label>
          <label className="sp-full">Login email<input value={profile.email} readOnly type="email" /><small>Your login email is managed through account administration.</small></label>
        </div><div className="sp-form-footer"><span className="sp-muted">{dirty ? 'You have unsaved changes.' : 'Your details are up to date.'}</span><div><button type="button" className="sp-secondary" disabled={!dirty} onClick={() => { populate(profile); setError(''); setNotice('') }}>Cancel changes</button><button className="sp-primary" disabled={!dirty || !!phoneError}>{saving ? 'Saving…' : 'Save changes'}</button></div></div></fieldset></form>
      </section>
      <section className="sp-card"><div className="sp-section-heading"><h3>Property Memberships</h3><span className="sp-muted">Assigned by your administrator</span></div>
        {!profile.memberships.length && <p className="sp-empty">No property membership has been assigned to your account.</p>}
        <div className="sp-memberships">{profile.memberships.map(m => <article className="sp-membership" key={m.id}><div className="sp-membership-top"><h4>{m.property_name}</h4><span className={`sp-badge ${m.active ? '' : 'sp-inactive'}`}>{m.active ? 'Active membership' : 'Not currently active'}</span></div><p>{m.address}</p><dl><div><dt>Property role</dt><dd>{m.staff_kind === 'manager' ? 'Manager' : 'Staff'}</dd></div><div><dt>Start date</dt><dd>{date(m.starts_at)}</dd></div><div><dt>End date</dt><dd>{m.ends_at ? date(m.ends_at) : 'No end date'}</dd></div><div><dt>Time zone</dt><dd>{m.time_zone}</dd></div></dl></article>)}</div>
      </section>
      <section className="sp-card"><h3>Account Details</h3><dl className="sp-account-details"><div><dt>Account ID</dt><dd className="sp-id">{profile.id}</dd></div><div><dt>Status</dt><dd>Active</dd></div></dl><p className="sp-note">Contact your administrator to change your login email, property assignment or management permissions.</p></section>
    </div></div>}
    {discardAction && <Modal title="Discard unsaved changes?" blockClose={saving || loading} onClose={() => setDiscardAction(null)}>
      <p>Your profile has unsaved changes. {discardAction === 'reload' ? 'Reloading will replace them with your saved details.' : 'Leaving will discard these edits.'}</p>
      <div className="sd-dialog-actions"><button type="button" onClick={() => setDiscardAction(null)}>Keep editing</button><button type="button" className="sd-primary" onClick={() => performDiscard(discardAction)}>{discardAction === 'reload' ? 'Discard and reload' : 'Discard and leave'}</button></div>
    </Modal>}
  </main>
}
