import { useState, useEffect } from 'react'
import { AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react'

const STORAGE_KEY = 'ffc-lowstock-collapsed'

export default function LowStockAlert({ products }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed))
    } catch {}
  }, [collapsed])

  if (!products || products.length === 0) return null

  const panelId = 'low-stock-panel'

  return (
    <div className="mt-6 bg-[#F5F3FF] border border-[#EDE9FE] rounded-xl p-4">
      <button
        type="button"
        className="flex items-center gap-2 w-full text-left cursor-pointer"
        aria-expanded={!collapsed}
        aria-controls={panelId}
        onClick={() => setCollapsed((c) => !c)}
      >
        <AlertTriangle size={18} className="text-[#7C3AED]" />
        <h3 className="font-semibold text-[#7C3AED]">Low Stock Alerts</h3>
        <span className="ml-auto bg-[#7C3AED] text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {products.length}
        </span>
        {collapsed ? (
          <ChevronDown size={18} className="text-[#7C3AED]" />
        ) : (
          <ChevronUp size={18} className="text-[#7C3AED]" />
        )}
      </button>
      {!collapsed && (
        <div id={panelId} className="flex flex-wrap gap-2 mt-2">
          {products.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1.5 bg-white border border-[#C4B5FD] text-[#6D28D9] text-sm px-3 py-1 rounded-full"
            >
              {p.name}
              <span className="font-bold text-[#7C3AED]">{p.qty} left</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
