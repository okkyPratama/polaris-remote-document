import { BrowserRouter, Routes, Route } from 'react-router-dom'
import InventoryPage from './views/inventory'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<InventoryPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
      </Routes>
    </BrowserRouter>
  )
}
