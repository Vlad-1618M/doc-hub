import { useEffect, useRef, useCallback } from 'react'

const API_BASE = import.meta.env.VITE_API_URL ?? ''
const WS_PATH = '/ws/dashboard'

/**
 * Build WebSocket URL from API base or current origin.
 * Converts http(s) to ws(s) for proxied or absolute API URLs.
 */
function getWebSocketUrl(): string {
  if (API_BASE) {
    const url = API_BASE.replace(/^http/, 'ws')
    return `${url.replace(/\/$/, '')}${WS_PATH}`
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  return `${proto}//${host}${WS_PATH}`
}

export type DashboardRefreshCallback = (updatedCollection?: string) => void

/** Coalesce rapid refresh broadcasts (e.g. remove --all) into one refetch after quiet period. */
const REFRESH_DEBOUNCE_MS = 500

/**
 * Hook to connect to dashboard WebSocket and trigger refetch on refresh events.
 * When backend broadcasts a refresh, the callback receives the collection name if provided.
 */
export function useDashboardWebSocket(onRefresh: DashboardRefreshCallback) {
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingCollectionRef = useRef<string | undefined>(undefined)

  const scheduleRefresh = useCallback((collection?: string) => {
    pendingCollectionRef.current = collection
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      const col = pendingCollectionRef.current
      pendingCollectionRef.current = undefined
      onRefreshRef.current(col)
    }, REFRESH_DEBOUNCE_MS)
  }, [])

  const connect = useCallback(() => {
    const url = getWebSocketUrl()
    const ws = new WebSocket(url)

    ws.onopen = () => {
      // Send ping every 25s to keep connection alive (proxies often timeout at 30s)
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('{}')
      }, 25000)
      ws.addEventListener('close', () => clearInterval(pingInterval), { once: true })
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.event === 'refresh') {
          // onRefreshRef.current(data.collection)
          scheduleRefresh(data.collection)
        }
      } catch {
        // ignore invalid JSON
      }
    }

    ws.onclose = () => {
      setTimeout(connect, 3000)
    }

    ws.onerror = () => {
      ws.close()
    }

    return () => ws.close()
  }, [scheduleRefresh])

  useEffect(() => {
    const cleanup = connect()
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      if (typeof cleanup === 'function') cleanup()
    }
  }, [connect])
}
