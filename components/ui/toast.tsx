'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error'
}

let toastListeners: ((toasts: Toast[]) => void)[] = []
let toasts: Toast[] = []

function notify(toast: Toast) {
  toasts = [...toasts, toast]
  toastListeners.forEach((listener) => listener(toasts))
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== toast.id)
    toastListeners.forEach((listener) => listener(toasts))
  }, 3000)
}

export function toast(message: string, type: 'success' | 'error' = 'success') {
  const id = Math.random().toString(36).substring(7)
  notify({ id, message, type })
  return id
}

export function ToastContainer() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([])

  useEffect(() => {
    const listener = (newToasts: Toast[]) => {
      setCurrentToasts(newToasts)
    }
    toastListeners.push(listener)
    setCurrentToasts(toasts)

    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener)
    }
  }, [])

  if (currentToasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {currentToasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'rounded-xl px-4 py-3 shadow-lg border min-w-[300px] max-w-md animate-in slide-in-from-right',
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          )}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {toast.type === 'success' ? '✅' : '❌'}
            </span>
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        </div>
      ))}
    </div>
  )
}


