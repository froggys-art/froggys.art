"use client"

import { useEffect, useState } from 'react'

type Props = {
  folder?: string
  columns?: number
  gap?: number
  className?: string
  images?: string[]
  items?: { src: string; num?: number }[]
  onSelect?: (p: { src: string; num?: number; index: number }) => void
}

export default function GalleryGrid({
  folder = 'full',
  columns = 5,
  gap = 12,
  className,
  images,
  items,
  onSelect,
}: Props) {
  const [fetchedImages, setFetchedImages] = useState<string[]>([])

  useEffect(() => {
    if (items || images) return
    let alive = true
    fetch(`/api/frogs/list?folder=${encodeURIComponent(folder)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return
        setFetchedImages(Array.isArray(d?.images) ? d.images : [])
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [folder, items, images])

  const style: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap,
  }

  const data: { src: string; num?: number }[] =
    items ?? (images ? images.map((s) => ({ src: s })) : fetchedImages.map((s) => ({ src: s })))

  return (
    <div className={className} style={style}>
      {data.map(({ src, num }, i) => (
        <div
          key={src + i}
          style={{ width: '100%', aspectRatio: '1 / 1' }}
          onClick={() => onSelect?.({ src, num, index: i })}
          className={onSelect ? 'cursor-pointer' : undefined}
        >
          <img
            src={src}
            alt={`Frog ${num ?? i + 1}`}
            className="pixelated"
            loading="lazy"
            decoding="async"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      ))}
    </div>
  )
}
