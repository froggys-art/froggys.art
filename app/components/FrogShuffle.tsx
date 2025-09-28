"use client"

import { useEffect, useRef, useState } from 'react'

type Props = {
  folder?: string
  intervalMs?: number
  className?: string
  width?: number
  height?: number
}

export default function FrogShuffle({
  folder = 'background-bitcoin-orange',
  intervalMs = 1000,
  className,
  width = 256,
  height = 256,
}: Props) {
  const [images, setImages] = useState<string[]>([])
  const [idx, setIdx] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let mounted = true
    fetch(`/api/frogs/list?folder=${encodeURIComponent(folder)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return
        const list: string[] = Array.isArray(data?.images) ? data.images : []
        setImages(list)
        // Preload a handful for smoother shuffle
        list.slice(0, 10).forEach((src) => {
          const img = new Image()
          img.src = src
        })
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [folder])

  useEffect(() => {
    if (images.length === 0) return
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setIdx((i) => (i + 1) % images.length)
    }, Math.max(250, intervalMs))
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [images, intervalMs])

  const current = images.length > 0 ? images[idx] : null

  return (
    <div className={className}>
      {current ? (
        // Using regular img for crisp pixel rendering
        <img
          src={current}
          alt="Bitcoin Frog"
          width={width}
          height={height}
          className="pixelated mx-auto"
          style={{ width, height }}
        />
      ) : (
        <div
          className="mx-auto"
          style={{ width, height, background: 'rgba(0,0,0,0.08)' }}
        />
      )}
    </div>
  )
}
