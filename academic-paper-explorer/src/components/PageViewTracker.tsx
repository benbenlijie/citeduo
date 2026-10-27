import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { apiUrl } from '../lib/apiBase'

// The server sees one HTML request per hard navigation, but the app is a SPA:
// moving from the graph to the reader is a client-side route change. Report
// those here so "page views" means what a reader expects. A module-level
// timestamp also absorbs React StrictMode's double effect in development.
let lastPath = ''
let lastAt = 0

export function PageViewTracker() {
  const location = useLocation()
  const first = useRef(true)

  useEffect(() => {
    const path = window.location.pathname + window.location.search
    const now = Date.now()
    if (path === lastPath && now - lastAt < 1500) return
    lastPath = path
    lastAt = now

    const referrer = first.current ? document.referrer : ''
    first.current = false

    void fetch(apiUrl('/analytics/pageview'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, referrer }),
      credentials: 'same-origin',
      keepalive: true,
    }).catch(() => {
      // Analytics must never get in the way of the app.
    })
  }, [location.pathname, location.search])

  return null
}
