"use client"
import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import FrogShuffle from './components/FrogShuffle'
import AboutContent from './components/AboutContent'
import GalleryGrid from './components/GalleryGrid'
import FilterDrawer, { type TraitGroup, type SelectedMap } from './components/FilterDrawer'
import ImageModal, { type ViewerItem } from './components/ImageModal'
import Leaderboard from './components/Leaderboard'
const VerifyPanel = dynamic(() => import('./components/VerifyPanel'), { ssr: false })

export default function HomePage() {
  const [view, setView] = useState<'hero' | 'about' | 'leaderboard' | 'faq' | 'gallery' | 'verify'>('hero')
  // Filters
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [traits, setTraits] = useState<TraitGroup[]>([])
  const [selected, setSelected] = useState<SelectedMap>({})
  // Results
  const [items, setItems] = useState<Array<{ num: number; name?: string; src: string; attributes?: any[] }>>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  // Viewer
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerItem, setViewerItem] = useState<ViewerItem | undefined>(undefined)
  // Drawer positioning relative to gallery viewport
  const galleryRef = useRef<HTMLDivElement | null>(null)
  const [drawerRect, setDrawerRect] = useState<{ top: number; left: number; height: number } | null>(null)
  // Count selected filters
  const selectedCount = useMemo(() => {
    let n = 0
    for (const arr of Object.values(selected)) n += Array.isArray(arr) ? arr.length : 0
    return n
  }, [selected])

  // Fetch traits lazily when gallery opens first time
  useEffect(() => {
    if (view !== 'gallery' || traits.length > 0) return
    fetch('/api/frogs/traits')
      .then((r) => r.json())
      .then((d) => {
        const list: TraitGroup[] = Array.isArray(d?.types) ? d.types : []
        setTraits(list)
      })
      .catch(() => {})
  }, [view, traits.length])

  // Build search query param
  const traitsParam = useMemo(() => {
    const entries = Object.entries(selected).filter(([, arr]) => Array.isArray(arr) && arr.length > 0)
    if (entries.length === 0) return ''
    try {
      const obj: Record<string, string[]> = {}
      for (const [k, v] of entries) obj[k] = v
      return encodeURIComponent(JSON.stringify(obj))
    } catch {
      return ''
    }
  }, [selected])

  // Fetch results when gallery open or filters change
  useEffect(() => {
    if (view !== 'gallery') return
    const url = traitsParam ? `/api/frogs/search?traits=${traitsParam}` : '/api/frogs/search'
    setLoading(true)
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d?.items) ? d.items : []
        setItems(list)
        setCount(typeof d?.count === 'number' ? d.count : list.length)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [view, traitsParam])

  // Ensure drawer is closed when leaving gallery view
  useEffect(() => {
    if (view !== 'gallery' && drawerOpen) setDrawerOpen(false)
  }, [view, drawerOpen])

  // Ensure image viewer closes when leaving gallery
  useEffect(() => {
    if (view !== 'gallery' && viewerOpen) setViewerOpen(false)
  }, [view, viewerOpen])

  // Close modal on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (viewerOpen) setViewerOpen(false)
        if (drawerOpen) setDrawerOpen(false)
      }
    }
    if (viewerOpen || drawerOpen) {
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }
  }, [viewerOpen, drawerOpen])

  // Keep drawer aligned with the visible gallery viewport
  useEffect(() => {
    if (view !== 'gallery') return
    const el = galleryRef.current
    function update() {
      const r = el?.getBoundingClientRect()
      if (!r) return
      setDrawerRect({ top: r.top, left: r.left, height: r.height })
    }
    update()
    window.addEventListener('resize', update)
    el?.addEventListener('scroll', update)
    return () => {
      window.removeEventListener('resize', update)
      el?.removeEventListener('scroll', update)
    }
  }, [view])

  function toggleTrait(trait: string, value: string) {
    setSelected((prev) => {
      const arr = new Set(prev[trait] || [])
      if (arr.has(value)) arr.delete(value)
      else arr.add(value)
      return { ...prev, [trait]: Array.from(arr) }
    })
  }
  function clearAll() {
    setSelected({})
  }
  function handleSelectItem(p: { src: string; num?: number; index: number }) {
    const it = items[p.index]
    if (!it) return
    setViewerItem({ src: it.src, num: it.num, name: it.name, attributes: it.attributes || [] })
    setViewerOpen(true)
  }
  return (
    <div
      className="fixed inset-0 w-full h-full overflow-hidden"
      style={{ background: 'var(--bg)' }}
    >
      {/* Header/title/nav fixed near top */}
      <div className="absolute inset-x-0 top-[clamp(12px,5vh,64px)] md:top-[clamp(40px,8vh,96px)] px-2 text-center z-20">
        <div className="flex flex-col items-center gap-[2px] md:gap-1">
          <h1
            className="font-8bit text-black text-3xl md:text-5xl tracking-wide cursor-pointer"
            onClick={() => setView('hero')}
          >
            FROGGYS
          </h1>
          <div className="mt-0.5 md:mt-2 font-press text-xs sm:text-sm flex flex-col items-center gap-1">
            <nav className="flex items-center justify-center gap-4">
              <a
                href="/#about"
                onClick={(e) => { e.preventDefault(); setView('about'); }}
                className={`text-black hover:opacity-80 ${view === 'about' ? '' : 'opacity-70'}`}
              >
                ABOUT
              </a>
              <a
                href="/#leaderboard"
                onClick={(e) => { e.preventDefault(); setView('leaderboard'); }}
                className={`text-black hover:opacity-80 ${view === 'leaderboard' ? '' : 'opacity-70'}`}
              >
                LEADERBOARD
              </a>
              <a
                href="/#faq"
                onClick={(e) => { e.preventDefault(); setView('faq'); }}
                className={`text-black hover:opacity-80 ${view === 'faq' ? '' : 'opacity-70'}`}
              >
                FAQ
              </a>
            </nav>
            <nav className="flex items-center justify-center gap-4">
              <span className="relative inline-block text-gray-500 line-through opacity-60 cursor-not-allowed select-none">
                GALLERY
              </span>
              <span className="relative inline-block text-gray-500 line-through opacity-60 cursor-not-allowed select-none">
                VERIFY
              </span>
            </nav>
          </div>
        </div>
      </div>

      {/* Center content (fixed size, centered) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl z-10" style={{ height: 'clamp(300px,55vh,760px)' }}>
          {/* Hero (image + quote) */}
          <div className={`absolute inset-0 flex flex-col items-center justify-start transition-opacity duration-300 ${view === 'hero' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <FrogShuffle
              folder="background-olive"
              intervalMs={900}
              className="frog-hero"
              width={240}
              height={240}
            />
            <figure className="mt-1 md:mt-4 max-w-[240px] md:max-w-xl mx-auto">
              <blockquote className="text-[10px] md:text-[12px] leading-tight text-black">
                "One fine day I woke up and wanted to put 10,000 more frogs on the Bitcoin blockchain at all costs."
              </blockquote>
              <figcaption className="mt-0.5 text-[10px] md:text-[12px] text-black/90">— Froggytoshi Nakamoto</figcaption>
            </figure>
          </div>
          {/* Leaderboard (centered, scrollable within existing layout) */}
          <div className={`absolute inset-0 overflow-y-auto px-4 transition-opacity duration-300 text-left scroll-blend ${view === 'leaderboard' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <Leaderboard />
          </div>
          {/* FAQ (content) */}
          <div className={`absolute inset-0 overflow-y-auto px-4 transition-opacity duration-300 text-left scroll-blend ${view === 'faq' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="w-full max-w-3xl mx-auto py-4">
              <div className="space-y-4 text-black">
                <section>
                  <h3 className="font-press font-semibold text-[12px] uppercase tracking-wide">What are Froggys?</h3>
                  <p className="font-press text-[12px] mt-1">Froggys are the next evolution of frog culture on Bitcoin Ordinals — a prequel to the OG Bitcoin Frogs. They carry forward the meme, the lore, and the spirit of frogs on-chain, while adding their own unpredictable twist of chaos.</p>
                </section>

                <section>
                  <h3 className="font-press font-semibold text-[12px] uppercase tracking-wide">Why Froggys?</h3>
                  <p className="font-press text-[12px] mt-1">The Bitcoin Frogs community made history, but the space has lacked clear direction and leadership. Froggys exist to fill that void — to cultivate unity, strengthen culture, and rally the swamp into one movement. By building structure where there’s been fragmentation, Froggys aim to keep the frog meme alive, loud, and thriving on Bitcoin.</p>
                </section>

                <section>
                  <h3 className="font-press font-semibold text-[12px] uppercase tracking-wide">How are Froggys connected to Bitcoin Frogs?</h3>
                  <p className="font-press text-[12px] mt-1">Froggys are both a tribute and an expansion pack. Bitcoin Frogs remain the original, iconic collection. Froggys are the swamp water that feeds the pond — bringing fresh energy, a new narrative, and more ways for frog culture to grow on Bitcoin.</p>
                </section>

                <section>
                  <h3 className="font-press font-semibold text-[12px] uppercase tracking-wide">How do I mint or collect Froggys?</h3>
                  <p className="font-press text-[12px] mt-1">Froggys live natively on Bitcoin through the Ordinals protocol. Details on minting and collection will be released soon. All official instructions will be shared through Froggys channels.</p>
                  <p className="font-press text-[12px] mt-1">TBA.</p>
                </section>

                <section>
                  <h3 className="font-press font-semibold text-[12px] uppercase tracking-wide">Why should I care about Froggys?</h3>
                  <ul className="font-press text-[12px] mt-1 list-disc pl-5 space-y-1">
                    <li><span className="font-semibold">Culture:</span> Frogs are eternal meme kings — Froggys evolve that crown on Bitcoin.</li>
                    <li><span className="font-semibold">History:</span> Bitcoin Frogs are already legendary; Froggys write the next chapter.</li>
                    <li><span className="font-semibold">Community:</span> Owning a Froggy plugs you into a growing swarm of collectors, artists, and frog fanatics shaping the space.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-press font-semibold text-[12px] uppercase tracking-wide">What makes Froggys unique compared to other Ordinals projects?</h3>
                  <ul className="font-press text-[12px] mt-1 list-disc pl-5 space-y-1">
                    <li><span className="font-semibold">Heritage:</span> Directly tied to one of the most important early Ordinals collections.</li>
                    <li><span className="font-semibold">Social-Fi:</span> Leaderboards, point systems, and Twitter integration will turn collecting into a gamified experience.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-press font-semibold text-[12px] uppercase tracking-wide">Will there be a treasury or a frog strategy?</h3>
                  <p className="font-press text-[12px] mt-1">That information is classified. All we can say is… RIBBIT 🐸</p>
                </section>
              </div>
            </div>
          </div>
          {/* About (scrollable) */}
          <div className={`absolute inset-0 overflow-y-auto px-4 transition-opacity duration-300 text-left scroll-blend ${view === 'about' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <AboutContent />
          </div>
          {/* Gallery (scrollable grid) */}
          <div
            ref={galleryRef}
            className={`absolute inset-0 overflow-y-auto px-4 transition-opacity duration-300 scroll-blend ${view === 'gallery' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            {/* Sticky header region keeps the toolbar anchored; drawer positioned right below */}
            <div className="sticky top-0 z-10" style={{ background: 'var(--bg)' }}>
              <div className="relative">
                <div className="flex items-center justify-between py-2">
                  <button onClick={() => setDrawerOpen((v) => !v)} className="font-press text-[10px] hover:opacity-80">
                    ☰ FILTERS{selectedCount ? ` (${selectedCount})` : ''}
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={clearAll}
                      disabled={selectedCount === 0}
                      className="font-press text-[10px] hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      CLEAR{selectedCount ? ` (${selectedCount})` : ''}
                    </button>
                    <div className="font-press text-[10px] opacity-80">{loading ? 'Loading…' : `${count} frogs`}</div>
                  </div>
                </div>
                {/* Drawer lives directly under the toolbar and matches gallery viewport height */}
                {drawerOpen && (
                  <FilterDrawer
                    open
                    traits={traits}
                    selected={selected}
                    onToggle={toggleTrait}
                    onClearAll={clearAll}
                    onClose={() => setDrawerOpen(false)}
                    position="absolute"
                    style={{ top: '100%', left: 0, height: Math.max(120, (drawerRect?.height || 0) - 40) }}
                  />
                )}
              </div>
            </div>
            <GalleryGrid columns={5} gap={12} items={items.map((it) => ({ src: it.src, num: it.num }))} onSelect={handleSelectItem} />
          </div>
          {/* Verify (center simple panel) */}
          <div className={`absolute inset-0 flex items-center justify-center px-4 transition-opacity duration-300 ${view === 'verify' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <VerifyPanel />
          </div>
        </div>

      {/* Footer (RIBBIT) fixed near bottom with dynamic offset */}
      <div className="absolute inset-x-0 px-2 text-center z-20 bottom-[clamp(12px,5vh,64px)] md:bottom-[clamp(40px,8vh,96px)]">
        <div className="relative">
          <span
            className="font-8bit text-black/50 text-4xl sm:text-5xl md:text-6xl leading-none inline-block cursor-not-allowed select-none"
            aria-disabled="true"
            title="Coming soon"
          >
            MINT
          </span>
        </div>
      </div>
      {/* Image viewer modal */}
      <ImageModal open={viewerOpen} item={viewerItem} onClose={() => setViewerOpen(false)} />
    </div>
  )
}
