"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type Row = { rank: number; handle: string; points: number }

type PageResp = { rows: Row[]; nextOffset?: number }

type MeResp = { handle: string; points: number; rank: number; lastScanAt?: string } | null

function formatUTC(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`
}

export default function Leaderboard() {
  const [rows, setRows] = useState<Row[]>([])
  const [nextOffset, setNextOffset] = useState<number | null>(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [me, setMe] = useState<MeResp>(null)

  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const hasMore = nextOffset !== null && typeof nextOffset === 'number'

  const fetchPage = useCallback(async (offset = 0, limit = 100): Promise<PageResp> => {
    const url = new URL('/api/leaderboard', window.location.origin)
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('offset', String(offset))
    const res = await fetch(url.toString(), { cache: 'no-store' })
    if (!res.ok) throw new Error('leaderboard_fetch_failed')
    return res.json()
  }, [])

  const refreshTop = useCallback(async () => {
    try {
      const target = Math.max(rows.length || 100, 100)
      const first = await fetchPage(0, target)
      setRows(first.rows)
      setNextOffset(typeof first.nextOffset === 'number' ? first.nextOffset : null)
    } catch (e) {
      setError('Failed to refresh leaderboard')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const page = await fetchPage(0, 100)
        if (cancelled) return
        setRows(page.rows || [])
        setNextOffset(typeof page.nextOffset === 'number' ? page.nextOffset : null)
      } catch (e) {
        if (!cancelled) setError('Failed to load leaderboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [fetchPage])

  useEffect(() => {
    const id = setInterval(() => {
      refreshTop()
      // also refresh "me" card periodically in case rank updates
      loadMe()
    }, 15000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return
    try {
      setLoadingMore(true)
      const page = await fetchPage(nextOffset || 0, 100)
      setRows((prev) => {
        const seen = new Set(prev.map((r) => r.rank))
        const merged = [...prev]
        for (const r of page.rows || []) if (!seen.has(r.rank)) merged.push(r)
        return merged
      })
      setNextOffset(typeof page.nextOffset === 'number' ? page.nextOffset : null)
    } catch (e) {
      // ignore
    } finally {
      setLoadingMore(false)
    }
  }, [fetchPage, hasMore, loadingMore, nextOffset])

  useEffect(() => {
    if (!sentinelRef.current) return
    const el = sentinelRef.current
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          loadMore()
        }
      }
    }, { rootMargin: '600px 0px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [loadMore])

  const meHandle = useMemo(() => me?.handle?.toLowerCase() || '', [me?.handle])

  const loadMe = useCallback(async () => {
    try {
      const addr = typeof window !== 'undefined' ? localStorage.getItem('bf_wallet_address') : null
      const url = new URL('/api/leaderboard/me', window.location.origin)
      if (addr) url.searchParams.set('address', addr)
      const res = await fetch(url.toString(), { cache: 'no-store' })
      if (!res.ok) return setMe(null)
      const j = await res.json()
      setMe(j)
    } catch {
      setMe(null)
    }
  }, [])

  useEffect(() => { loadMe() }, [loadMe])

  return (
    <div className="leaderboard w-full max-w-4xl mx-auto py-4">
      <header className="text-center mb-4">
        <h2 className="font-8bit text-2xl text-black">Froggys Leaderboard</h2>
        <p className="font-press text-[12px] text-black/80 mt-1">
          Points update every 12 hours. Verify and connect your Twitter on bitcoinfrogs.art.
        </p>
        <p className="font-press text-[11px] text-black/70 mt-1">
          RIBBIT posts with @JoinFroggys mention earn bonus points.
        </p>
        <div className="mt-2">
          <a
            href="https://www.bitcoinfrogs.art/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-2 border border-black/30 bg-black/5 hover:bg-black/10 transition font-press text-[12px]"
          >
            Verify at bitcoinfrogs.art
          </a>
        </div>
      </header>

      <div className="sticky top-0 z-10">
        <div className="inline-block max-w-full">
          <div className="font-press text-[11px] px-3 py-2 border border-black/30 inline-flex items-center gap-3" style={{ background: 'var(--bg)' }}>
            <span className="opacity-80">Your rank:</span>
            {me ? (
              <>
                <span className="font-semibold">#{me.rank}</span>
                <span className="opacity-80">·</span>
                <span className="opacity-90">{me.points} pts</span>
                {me.lastScanAt && (
                  <span className="opacity-70">· Last scan {formatUTC(me.lastScanAt)}</span>
                )}
              </>
            ) : (
              <>
                <span className="opacity-80">Unknown</span>
                <span className="opacity-80">·</span>
                <a className="underline hover:opacity-80" href="https://www.bitcoinfrogs.art/" target="_blank" rel="noopener noreferrer">Verify at bitcoinfrogs.art</a>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left border-collapse" role="table" aria-label="Leaderboard">
          <thead>
            <tr className="border-b border-black/20">
              <th className="rank w-16 py-2 px-2 font-press text-[11px]">Rank</th>
              <th className="py-2 px-2 font-press text-[11px]">Handle</th>
              <th className="points w-24 py-2 px-2 font-press text-[11px] text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={3} className="py-6 text-center font-press text-[12px]">
                  No ranked accounts yet. Verify via bitcoinfrogs.art.
                </td>
              </tr>
            ) : null}
            {rows.map((r) => {
              const isMe = me && (meHandle && r.handle?.toLowerCase() === meHandle || (me.rank && r.rank === me.rank))
              return (
                <tr key={r.rank} className={`border-b border-black/10 ${isMe ? 'me' : ''} ${isMe ? 'border border-black/40' : ''}`}> 
                  <td className="rank py-2 px-2">#{r.rank}</td>
                  <td className="py-2 px-2 font-press">{r.handle}</td>
                  <td className="points py-2 px-2 text-right">{r.points}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div ref={sentinelRef} className="h-8" />
        {loadingMore && (
          <div className="text-center py-2 font-press text-[11px]">Loading more…</div>
        )}
        {error && (
          <div className="text-center py-2 font-press text-[11px] text-red-900">{error}</div>
        )}
      </div>
    </div>
  )
}
