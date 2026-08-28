import { BrowserRouter, Routes, Route } from 'react-router-dom'
import CommonPage from './views/common'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CommonPage />} />
        <Route path="/common" element={<CommonPage />} />
      </Routes>
    </BrowserRouter>
  )
}
