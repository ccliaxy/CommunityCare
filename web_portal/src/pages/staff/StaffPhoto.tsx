import { useEffect, useRef, useState } from 'react'
import { api, backendUrl } from '../../lib/backendApi'
import { supabase } from '../../lib/supabase'
import { Modal } from './PortalUI'
import './StaffPhoto.css'
type Photo = { id: string | null; url: string | null }
export default function StaffPhoto({ name, disabled, onBusy }: { name: string; disabled: boolean; onBusy: (busy: boolean) => void }) {
 const [photo, setPhoto] = useState<Photo | null>(null), [error, setError] = useState(''), [notice, setNotice] = useState('')
 const [busy, setBusy] = useState(false), [pending, setPending] = useState<Blob | null>(null), [preview, setPreview] = useState(''), [remove, setRemove] = useState(false)
 const [menu, setMenu] = useState(false), [view, setView] = useState(false)
 const menuRoot = useRef<HTMLDivElement>(null), avatarButton = useRef<HTMLButtonElement>(null)
 useEffect(() => {
  if (!menu) return
  const outside = (e: PointerEvent) => { if (!menuRoot.current?.contains(e.target as Node)) setMenu(false) }
  document.addEventListener('pointerdown', outside)
  return () => document.removeEventListener('pointerdown', outside)
 }, [menu])
 const [editor, setEditor] = useState(false)
 const editing = useRef(false); editing.current = editor
 const input = useRef<HTMLInputElement>(null), lock = useRef(false), alive = useRef(true)
 async function load(signal?: AbortSignal) {
  const p = await api<Photo>('/staff/profile/photo', { signal })
  if (p.url) { const u = new URL(p.url); if (u.origin !== new URL(import.meta.env.VITE_SUPABASE_URL).origin || !u.pathname.startsWith('/storage/v1/object/sign/staff-profile-photos/')) throw new Error('Invalid photo link.') }
  if (alive.current && !signal?.aborted) setPhoto(p)
 }
 useEffect(() => { alive.current = true; const c = new AbortController(); const refresh = () => { if (!lock.current && !editing.current && !document.hidden) void load(c.signal).catch(e => { if (!c.signal.aborted) { setPhoto(null); setError(e.message) } }) }; refresh(); const timer = setInterval(refresh, 480000); window.addEventListener('focus', refresh); return () => { alive.current = false; c.abort(); clearInterval(timer); window.removeEventListener('focus', refresh) } }, [])
 useEffect(() => { if (!pending) { setPreview(''); return } const url = URL.createObjectURL(pending); setPreview(url); return () => URL.revokeObjectURL(url) }, [pending])
 useEffect(() => { onBusy(busy || editor); return () => onBusy(false) }, [busy, editor, onBusy])
 async function select(file?: File) {
  if (!file || lock.current) return
  lock.current = true; setBusy(true); setError(''); setNotice('')
  try {
   if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024 || !file.size) throw new Error('Choose a JPG, JPEG, PNG or WebP image up to 5 MB.')
   const bitmap = await createImageBitmap(file)
   try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 40000000) throw new Error('Choose a smaller photo (up to 40 megapixels).')
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512
    const context = canvas.getContext('2d'); if (!context) throw new Error('Your browser could not prepare this photo.')
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, 512, 512)
    const side = Math.min(bitmap.width, bitmap.height)
    context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 512, 512)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Unable to prepare photo.')), 'image/jpeg', .9))
    if (alive.current) setPending(blob)
   } finally { bitmap.close() }
  } catch (e) { if (alive.current) setError((e as Error).message) }
  finally { lock.current = false; if (alive.current) setBusy(false); if (input.current) input.current.value = '' }
 }
 async function save(deleting = false) {
  if (lock.current || !photo || (!deleting && !pending)) return
  lock.current = true; setBusy(true); setError(''); setNotice('')
  try {
   const path = `/staff/profile/photo?expected=${encodeURIComponent(photo.id || '')}`
   if (deleting) await api(path, { method: 'DELETE' })
   else {
    const session = await supabase?.auth.getSession(); if (!session?.data.session) throw new Error('Please sign in again.')
    const r = await fetch(`${backendUrl}/api${path}`, { method: 'PUT', headers: { Authorization: `Bearer ${session.data.session.access_token}`, 'Content-Type': 'application/octet-stream' }, body: pending, signal: AbortSignal.timeout(60000) })
    const result = await r.json(); if (!r.ok) throw new Error(result.error || 'Photo upload failed.')
   }
   if (alive.current) { setPending(null); setRemove(false); setPhoto(null); setNotice(deleting ? 'Photo removed.' : 'Photo saved.'); await load() }
  } catch (e) {
   if (alive.current) { setPending(null); setRemove(false); setError(`${(e as Error).message} Reload your photo before retrying.`); setPhoto(null); try { await load() } catch { /* Keep the retry control visible. */ } }
  } finally { lock.current = false; if (alive.current) setBusy(false) }
 }
 const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(n => Array.from(n)[0]).join('').toUpperCase()
 function closeEditor() { if (busy) return; setPending(null); setRemove(false); setEditor(false); setNotice('') }
 function imageFailed() { setPhoto(p => p ? { ...p, url: null } : p); setError('Photo could not be displayed. Reload it or choose another image.') }
 return <div className="sp-photo">
  <div ref={menuRoot} className="sp-photo-avatar-wrap" onMouseEnter={() => { if (!disabled && !busy && !editor && !view) setMenu(true) }} onMouseLeave={() => { if (!menuRoot.current?.contains(document.activeElement)) setMenu(false) }} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setMenu(false) }} onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); avatarButton.current?.focus(); setMenu(false) } }}>
   <button ref={avatarButton} type="button" className="sp-photo-trigger" aria-label="Profile photo options" aria-expanded={menu} aria-controls="staff-photo-options" title={disabled ? 'Finish your profile edits before changing the photo' : 'Photo options'} disabled={disabled || busy} onClick={() => setMenu(v => !v)}>
    <span className="sp-avatar">{photo?.url ? <img src={photo.url} alt={`${name}'s profile photo`} onError={imageFailed} /> : <span aria-hidden="true">{initials}</span>}</span>
    <span className={`sp-photo-overlay ${menu ? 'is-visible' : ''}`}><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 7h4l2-3h6l2 3h4v13H3z" /><circle cx="12" cy="13" r="4" /></svg></span>
   </button>
   {menu && <div className="sp-photo-menu" id="staff-photo-options" aria-label="Photo options">
    <button type="button" disabled={!photo?.url} onClick={() => { setMenu(false); setView(true) }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>View photo</button>
    <button type="button" disabled={!photo || busy} onClick={() => { setMenu(false); input.current?.click() }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h7l2 3h9v11H3zM3 6V4h7l2 2" /></svg>{photo?.id ? 'Change photo' : 'Upload photo'}</button>
    {photo?.id && <button type="button" className="sp-photo-menu-remove" onClick={() => { setMenu(false); setRemove(true); setEditor(true); setNotice('') }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7" /></svg>Remove photo</button>}
    {(!photo || error) && <button type="button" onClick={() => { setMenu(false); setEditor(true) }}>Reload photo</button>}
   </div>}
  </div>
  <input ref={input} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" hidden onChange={e => { const file = e.target.files?.[0]; if (file) { setMenu(false); setEditor(true); void select(file) } }} />
  {view && <Modal title="Profile photo" onClose={() => setView(false)}><img className="sp-photo-full" src={photo?.url || ''} alt={`${name}'s profile photo`} /></Modal>}
  {editor && <Modal title="Edit profile photo" blockClose={busy} onClose={closeEditor}>
   <div className="sp-photo-editor">
    <div className="sp-photo-large">{pending && preview ? <img src={preview} alt="New profile photo preview" /> : photo?.url ? <img src={photo.url} alt={`${name}'s profile photo`} onError={imageFailed} /> : <span aria-label="No profile photo">{initials}</span>}</div>
    <p className="sp-photo-help">JPG, JPEG, PNG or WebP · Up to 5 MB</p>
    {error && <p className="sp-photo-error" role="alert">{error}</p>}{notice && <p className="sp-photo-success" role="status">{notice}</p>}
    {(!photo || error) && <button type="button" disabled={busy} onClick={() => { setError(''); void load().catch(e => setError(e.message)) }}>Reload photo</button>}
    {remove ? <><p>Remove your photo and display your initials instead?</p><div className="sp-photo-buttons"><button type="button" disabled={busy} onClick={() => setRemove(false)}>Keep photo</button><button type="button" className="sp-photo-remove" disabled={busy} onClick={() => void save(true)}>{busy ? 'Removing…' : 'Confirm removal'}</button></div></> : <>
     <div className="sp-photo-buttons"><button type="button" disabled={busy || !photo} onClick={() => input.current?.click()}>{busy ? 'Please wait…' : pending || photo?.id ? 'Change photo' : 'Add photo'}</button>{photo?.id && !pending && <button type="button" className="sp-photo-remove" disabled={busy} onClick={() => setRemove(true)}>Remove</button>}</div>
     {pending && <><p className="sp-photo-help">Preview your photo, then save. It will be cropped to the circle shown above.</p><div className="sp-photo-buttons"><button type="button" disabled={busy} onClick={() => setPending(null)}>Cancel change</button><button type="button" className="sp-photo-save" disabled={busy || !photo} onClick={() => void save()}>{busy ? 'Saving…' : 'Save photo'}</button></div></>}
    </>}
   </div>
  </Modal>}
 </div>
}

