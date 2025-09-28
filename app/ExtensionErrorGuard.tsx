"use client"

import { useEffect } from 'react'

function isFromExtensionStack(s?: string) {
  if (!s) return false
  return s.includes('chrome-extension://') || s.includes('moz-extension://') || s.includes('safari-extension://')
}

export default function ExtensionErrorGuard() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      const src = `${e.filename ?? ''}\n${(e.error as any)?.stack ?? ''}`
      const msg = `${e.message ?? ''}`
      if (isFromExtensionStack(src) || msg.includes('Cannot redefine property: ethereum')) {
        // Swallow extension-injected runtime errors to keep Next.js dev overlay stable
        e.preventDefault()
        ;(e as any).stopImmediatePropagation?.()
        return false
      }
      return undefined
    }

    const onUnhandled = (e: PromiseRejectionEvent) => {
      const reason: any = e.reason
      const stack = `${reason?.stack ?? ''}`
      const msg = `${reason?.message ?? reason ?? ''}`
      if (isFromExtensionStack(stack) || msg.includes('Cannot redefine property: ethereum') || msg.includes('Cannot convert undefined or null to object')) {
        e.preventDefault()
        ;(e as any).stopImmediatePropagation?.()
        return false
      }
      return undefined
    }

    window.addEventListener('error', onError, true)
    window.addEventListener('unhandledrejection', onUnhandled, true)
    return () => {
      window.removeEventListener('error', onError, true)
      window.removeEventListener('unhandledrejection', onUnhandled, true)
    }
  }, [])

  return null
}
