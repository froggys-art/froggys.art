"use client"

type Attr = { trait_type?: string; value?: string }

export type ViewerItem = {
  src: string
  num?: number
  name?: string
  attributes?: Attr[]
}

type Props = {
  open: boolean
  item?: ViewerItem
  onClose: () => void
}

export default function ImageModal({ open, item, onClose }: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-[#f6a23e] text-black border border-black/30 shadow-2xl max-w-5xl w-[90%] max-h-[85vh] rounded p-3 grid md:grid-cols-[minmax(0,1fr)_260px] gap-3">
          <div className="flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-2">
              <div className="font-8bit text-lg truncate">
                {item?.name || (item?.num ? `Bitcoin Frog #${item.num}` : 'Bitcoin Frog')}
              </div>
              <button onClick={onClose} className="font-press text-[10px] hover:opacity-80">CLOSE</button>
            </div>
            <div className="w-full flex-1 overflow-auto flex items-center justify-center">
              {item?.src ? (
                <img
                  src={item.src}
                  alt={item?.name || `Frog ${item?.num ?? ''}`}
                  className="pixelated"
                  style={{ maxWidth: '100%', maxHeight: '65vh', height: 'auto', imageRendering: 'pixelated' as any }}
                />
              ) : null}
            </div>
          </div>
          <aside className="overflow-auto scroll-blend p-2 border-l border-black/20">
            <div className="font-8bit text-base mb-2">Traits</div>
            <div className="space-y-1 text-[11px] font-press">
              {(item?.attributes || []).map((a, idx) => (
                <div key={(a?.trait_type || 't') + idx} className="flex items-center justify-between border-b border-black/10 py-1">
                  <span className="opacity-80">{a?.trait_type}</span>
                  <span className="font-semibold">{String(a?.value ?? '')}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
