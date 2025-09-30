"use client"

export type TraitValue = { value: string; count: number }
export type TraitGroup = { trait_type: string; values: TraitValue[] }

export type SelectedMap = Record<string, string[]>

type Props = {
  open: boolean
  traits: TraitGroup[]
  selected: SelectedMap
  onToggle: (trait: string, value: string) => void
  onClearAll: () => void
  onClose: () => void
  position?: 'absolute' | 'fixed'
  style?: React.CSSProperties
}

export default function FilterDrawer({ open, traits, selected, onToggle, onClearAll, onClose, position = 'absolute', style }: Props) {
  if (!open) return null
  return (
    <aside
      className={`${position} top-0 left-0 h-full w-56 text-black border-r border-black/20 shadow z-20`}
      style={{ ...(style || {}), background: 'var(--bg)' }}
      aria-hidden={!open}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-black/20">
        <span className="font-8bit text-[11px] opacity-90">TRAITS</span>
        <button onClick={onClose} className="font-press text-[10px] hover:opacity-80">✕</button>
      </div>
      <div className="overflow-y-auto h-[calc(100%-40px)] px-3 py-2 scroll-blend">
        {traits.map((g) => (
          <div key={g.trait_type} className="mb-3">
            <div className="font-8bit text-[11px] mb-1 opacity-90">{g.trait_type}</div>
            <div className="space-y-1">
              {g.values.map((tv) => {
                const sel = (selected[g.trait_type] || []).includes(tv.value)
                return (
                  <label key={tv.value} className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="accent-black"
                        checked={sel}
                        onChange={() => onToggle(g.trait_type, tv.value)}
                      />
                      <span>{tv.value}</span>
                    </span>
                    <span className="opacity-70">{tv.count}</span>
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="px-3 py-2 border-t border-black/20 flex items-center justify-between">
        <button onClick={onClearAll} className="font-press text-[10px] hover:opacity-80">CLEAR</button>
        <button onClick={onClose} className="font-press text-[10px] hover:opacity-80">APPLY</button>
      </div>
    </aside>
  )
}
