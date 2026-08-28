interface SpatialPageHeaderProps {
  title: string
  subtitle: string
}

export function SpatialPageHeader({ title, subtitle }: SpatialPageHeaderProps) {
  return (
    <div>
      <div className="text-[11px] text-[#a9b1c6] mb-0.5">
        Master Data <span className="mx-1">›</span> Spatial Setup
      </div>
      <div>
        <h1 className="text-[17px] font-bold text-[#001871] tracking-tight">{title}</h1>
        <p className="text-xs text-[#485885] mt-0.5">{subtitle}</p>
      </div>
    </div>
  )
}
