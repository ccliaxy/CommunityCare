import { useEffect, useMemo, useRef, useState } from 'react'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './AlertLocationMap.css'
import type { AlertRecord } from './PortalContext'


export default function AlertLocationMap({ alert }: { alert: AlertRecord }) {
  const host = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const [tileError, setTileError] = useState(false)
  const [visible, setVisible] = useState(false)
  const latitude = alert.coordinates?.[0], longitude = alert.coordinates?.[1]
  const coordinates = useMemo<[number, number] | null>(() => latitude === undefined || longitude === undefined ? null : [latitude, longitude], [latitude, longitude])

  useEffect(() => {
    if (!host.current) return
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setVisible(true)
        observer.disconnect()
      }
    })
    observer.observe(host.current)
    return () => observer.disconnect()
  }, [coordinates])

  useEffect(() => {
    if (!host.current || !coordinates || !visible) return
    const map = L.map(host.current, { scrollWheelZoom: false, minZoom: 3, maxZoom: 19 })
      .setView(coordinates, 16)
    mapRef.current = map
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      keepBuffer: 0,
      updateWhenIdle: true,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)
    tiles.on('tileerror', () => setTileError(true))
    const popup = document.createElement('div')
    // textContent keeps names and other future database values out of HTML parsing.
    popup.textContent = `${alert.id} · ${alert.name} · Unit ${alert.unit} · ${alert.type} · ${alert.time.replace('T', ' ')} · Recorded event location`
    L.marker(coordinates, {
      icon: L.divIcon({ className: 'cc-alert-pin', html: '<span aria-hidden="true">!</span>', iconSize: [32, 40], iconAnchor: [16, 40], popupAnchor: [0, -40] }),
      title: `Recorded event location for ${alert.id}`,
      alt: `Recorded event location for ${alert.name}`,
    }).addTo(map).bindPopup(popup).openPopup()
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }))
    observer.observe(host.current)
    return () => {
      observer.disconnect()
      tiles.off('tileerror')
      map.remove()
      mapRef.current = null
    }
  }, [coordinates, visible, alert.id, alert.name, alert.unit, alert.type, alert.time])

  if (!coordinates) return <div className="cc-location-empty">This alert has no coordinates that can be displayed on this map. No location has been guessed.</div>
  return <section className="cc-alert-location" aria-label="Selected alert location">
    <div className="cc-location-summary"><strong>{alert.name} · Current unit {alert.unit}</strong><span>{alert.type} · {alert.time.replace('T', ' ')}</span></div>
    <p className="cc-location-demo">RECORDED EVENT LOCATION · Not live GPS</p>
    <div ref={host} className="cc-alert-map" aria-label={`Interactive OpenStreetMap showing the recorded event location for ${alert.id}`} />
    {tileError && <p role="status" className="cc-location-error">Some map tiles could not load. Check your internet connection. The marker alone does not confirm that the map loaded.</p>}
    <div className="cc-location-toolbar"><span>Latitude {coordinates[0].toFixed(5)} · Longitude {coordinates[1].toFixed(5)}</span><button type="button" onClick={() => mapRef.current?.setView(coordinates, 16)}>Centre on alert</button></div>
    <p className="pp-muted">This pin uses the coordinates saved with this alert. It does not track the resident or change the family's safe zone. Test records may contain fictional coordinates.</p>
  </section>
}

