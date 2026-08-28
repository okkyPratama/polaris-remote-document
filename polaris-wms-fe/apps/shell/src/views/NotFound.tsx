import { Link } from 'react-router-dom'
import { Button } from '@polaris/ui'

export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-[fadeUp_0.3s_ease-out]">
      <h1 className="text-6xl font-bold text-[#dee1ed]">404</h1>
      <p className="mt-3 text-sm text-[#485885]">Halaman tidak ditemukan</p>
      <Link to="/" className="mt-5">
        <Button variant="outline">Kembali ke Beranda</Button>
      </Link>
    </div>
  )
}
