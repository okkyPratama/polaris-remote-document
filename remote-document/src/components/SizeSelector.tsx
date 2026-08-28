import { STANDARD_SIZES, type PageSize, type SizeType } from '@/types/template'

interface SizeSelectorProps {
  onSelect: (size: PageSize, marginMm: number) => void
}

export default function SizeSelector({ onSelect }: SizeSelectorProps) {
  const entries = Object.entries(STANDARD_SIZES) as [
    SizeType,
    { name: string; size: PageSize; defaultMarginMm: number },
  ][]

  return (
    <div>
      <h3 className="text-[13px] font-semibold text-[#001871] mb-3">Pilih Ukuran Kanvas</h3>
      <div className="grid grid-cols-2 gap-3">
        {entries.map(([key, { name, size, defaultMarginMm }]) => {
          const isLandscape = size.orientation === 'landscape'
          // Scale preview box proportionally, capped at comfortable display sizes
          const maxW = 72
          const maxH = 72
          const scale = isLandscape
            ? Math.min(maxW / size.widthMm, maxH / size.heightMm)
            : Math.min(maxW / size.widthMm, maxH / size.heightMm)
          const previewW = Math.round(size.widthMm * scale * 0.6)
          const previewH = Math.round(size.heightMm * scale * 0.6)

          return (
            <button
              key={key}
              onClick={() => onSelect(size, defaultMarginMm)}
              className="flex items-center gap-3 p-3 border-2 border-[#ebebeb] rounded-xl bg-white hover:border-[#001871] hover:shadow-[0_0_0_3px_rgba(0,24,113,0.08)] transition-all text-left"
              aria-label={`Pilih ukuran ${name}`}
            >
              <div
                className="flex-shrink-0 border border-[#d1d5db] rounded bg-[#f9fafb]"
                style={{ width: previewW, height: previewH }}
              />
              <div>
                <div className="text-[12px] font-semibold text-[#1f2b59] leading-tight">{name}</div>
                <div className="text-[11px] text-[#949eb8] mt-0.5 font-mono">
                  {size.widthMm} × {size.heightMm} mm
                </div>
                <div className="text-[10px] text-[#a9b1c6] mt-0.5 capitalize">
                  {size.orientation} · margin {defaultMarginMm} mm
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
