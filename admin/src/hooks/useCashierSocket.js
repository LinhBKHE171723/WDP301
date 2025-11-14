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

export default function useCashierSocket({ onOrderPreparing, onOrderPaid, onPaymentRequested } = {}) {
  const callbacksRef = useRef({ onOrderPreparing, onOrderPaid, onPaymentRequested })
  callbacksRef.current = { onOrderPreparing, onOrderPaid, onPaymentRequested }

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
        console.log("🔌 [useCashierSocket] WebSocket connected, sending auth...")
        if (token) {
          socket?.send(
            JSON.stringify({
              type: "auth",
              role: "cashier",
              token,
            })
          )
          console.log("✅ [useCashierSocket] Auth message sent with token")
        } else {
          socket?.send(JSON.stringify({ type: "auth", role: "cashier" }))
          console.log("✅ [useCashierSocket] Auth message sent without token")
        }
      }

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          console.log("📨 [useCashierSocket] Received message:", message.type)
          
          const { onOrderPreparing, onOrderPaid, onPaymentRequested } = callbacksRef.current

          switch (message.type) {
            case "auth_success":
              console.log("✅ [useCashierSocket] Authenticated as cashier")
              break
            case "cashier.orders.preparing":
              console.log("📦 [useCashierSocket] Order preparing:", message.data)
              onOrderPreparing?.(message.data)
              break
            case "cashier.orders.paid":
              console.log("💰 [useCashierSocket] Order paid:", message.data)
              onOrderPaid?.(message.data)
              break
            case "payment:requested":
              console.log("💳 [useCashierSocket] Payment requested:", message.data)
              onPaymentRequested?.(message.data)
              break
            default:
              console.log("❓ [useCashierSocket] Unknown message type:", message.type)
              break
          }
        } catch (error) {
          console.error("❌ [useCashierSocket] Error parsing message:", error, event.data)
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


