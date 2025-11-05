import { useEffect, useRef } from "react"

function resolveWebSocketUrl() {
  const envUrl = process.env.REACT_APP_WS_URL
  if (envUrl) return envUrl

  const apiUrl = process.env.REACT_APP_API_URL
  if (apiUrl) {
    try {
      const url = new URL(apiUrl)
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
      url.pathname = url.pathname.replace(/\/api\/?$/, "")
      if (!url.pathname.endsWith("/")) url.pathname += "/"
      url.pathname += "ws"
      return url.toString()
    } catch (error) {
      console.warn("Không thể phân tích REACT_APP_API_URL để tạo websocket URL", error)
    }
  }

  if (typeof window !== "undefined" && window.location) {
    const { protocol, host } = window.location
    const wsProtocol = protocol === "https:" ? "wss:" : "ws:"
    return `${wsProtocol}//${host}/ws`
  }

  return null
}

const RECONNECT_DELAY = 3000

export default function useCashierSocket({ onOrderPreparing, onOrderPaid } = {}) {
  const callbacksRef = useRef({ onOrderPreparing, onOrderPaid })
  callbacksRef.current = { onOrderPreparing, onOrderPaid }

  useEffect(() => {
    const wsUrl = resolveWebSocketUrl()
    if (!wsUrl) {
      console.warn("Không xác định được WebSocket URL cho cashier")
      return
    }

    let socket = null
    let reconnectTimer = null
    let closedByUser = false

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : undefined

    const cleanup = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      if (socket) {
        socket.onopen = null
        socket.onclose = null
        socket.onerror = null
        socket.onmessage = null
        try {
          socket.close()
        } catch (error) {
          console.error("Đóng socket cashier thất bại", error)
        }
      }
      socket = null
    }

    const scheduleReconnect = () => {
      if (closedByUser) return
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(connect, RECONNECT_DELAY)
      }
    }

    const connect = () => {
      cleanup()
      socket = new WebSocket(wsUrl)

      socket.onopen = () => {
        if (token) {
          socket?.send(
            JSON.stringify({
              type: "auth",
              role: "cashier",
              token,
            })
          )
        } else {
          socket?.send(JSON.stringify({ type: "auth", role: "cashier" }))
        }
      }

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          const { onOrderPreparing, onOrderPaid } = callbacksRef.current

          switch (message.type) {
            case "cashier.orders.preparing":
              onOrderPreparing?.(message.data)
              break
            case "cashier.orders.paid":
              onOrderPaid?.(message.data)
              break
            default:
              break
          }
        } catch (error) {
          console.error("Không thể phân tích dữ liệu WebSocket từ cashier", error)
        }
      }

      socket.onclose = scheduleReconnect
      socket.onerror = () => {
        scheduleReconnect()
      }
    }

    connect()

    return () => {
      closedByUser = true
      cleanup()
    }
  }, [])
}


