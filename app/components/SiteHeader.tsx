"use client"

import { usePathname } from 'next/navigation'

export default function SiteHeader() {
  const pathname = usePathname()
  if (pathname === '/') return null

  return (
    <header className="absolute inset-x-0 top-0 z-40 m-0">
      <div className="p-0 m-0 flex items-center justify-between">
        <a href="/" className="font-8bit text-black text-2xl md:text-3xl tracking-wide">FROGGYS</a>
        <div className="text-black text-xs sm:text-sm font-press flex flex-col items-end md:items-center gap-1">
          <nav className="flex items-center gap-6">
            <a href="/#about" className="hover:opacity-80">ABOUT</a>
            <a href="/#leaderboard" className="hover:opacity-80">LEADERBOARD</a>
            <a href="/#faq" className="hover:opacity-80">FAQ</a>
          </nav>
          <nav className="flex items-center gap-6">
            <span className="relative inline-block text-gray-500 line-through opacity-60 cursor-not-allowed select-none">
              GALLERY
            </span>
            <span className="relative inline-block text-gray-500 line-through opacity-60 cursor-not-allowed select-none">
              VERIFY
            </span>
          </nav>
        </div>
      </div>
    </header>
  )
}
