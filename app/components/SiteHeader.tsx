"use client"

import { usePathname } from 'next/navigation'

export default function SiteHeader() {
  const pathname = usePathname()
  if (pathname === '/') return null

  return (
    <header className="absolute inset-x-0 top-0 z-40 m-0">
      <div className="p-0 m-0 flex items-center justify-between">
        <a href="/" className="font-8bit text-white text-2xl md:text-3xl tracking-wide">BITCOIN FROGS</a>
        <nav className="flex items-center gap-8 text-white text-xs sm:text-sm font-press">
          <a href="/#about" className="hover:opacity-80">ABOUT</a>
          <a href="/gallery" className="hover:opacity-80">GALLERY</a>
        </nav>
      </div>
    </header>
  )
}
