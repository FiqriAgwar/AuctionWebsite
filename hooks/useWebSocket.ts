"use client"

import { useState, useEffect } from "react"

export function useWebSocket(url: string) {
  const [socket, setSocket] = useState<WebSocket | null>(null)

  useEffect(() => {
    const ws = new WebSocket(url)
    setSocket(ws)

    return () => {
      ws.close()
    }
  }, [url])

  return socket
}

