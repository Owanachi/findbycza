import { useState, useEffect, useMemo } from 'react'
import { AlertTriangle, ChevronUp, ChevronDown, ChevronRight } from 'lucide-react'

const STORAGE_KEY = 'ffc-lowstock-collapsed'

export default function LowStockAlert({ products }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })
  const [expandedCats, setExpandedCats] = useState(new Set())
  const [filterCat, setFilterCat] = useState('All')

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed))
    } catch {}
  }, [collapsed])

  // Group by category, sorted by count descending
  const grouped = useMemo(() => {
    if (!products || products.length === 0) return []
    const map = {}
    for (const p of products) {
      const cat = p.category || 'Uncategorized'
      if (!map[cat]) map[cat] = []
      map[cat].push(p)
    }
    return Object.entries(map)
      .map(([cat, items]) => ({ cat, items }))
      .sort((a, b) => b.items.length - a.items.length)
  }, [products])

  const categoryNames = useMemo(() => grouped.map((g) => g.cat), [grouped])

  const displayed = useMemo(() => {
    if (filterCat === 'All') return grouped
    return grouped.filter((g) => g.cat === filterCat)
  }, [grouped, filterCat])

  if (!products || products.length === 0) return null

  const toggleCat = (cat) => {
    setExpandedCats((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

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
        <div id={panelId} className="mt-3 space-y-2">
          {/* Category filter */}
          <div className="mb-2">
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              className="px-3 py-1.5 text-sm border border-[#C4B5FD] rounded-lg bg-white focus:ring-2 focus:ring-[#7C3AED] focus:border-[#7C3AED] outline-none"
            >
              <option value="All">All Categories</option>
              {categoryNames.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Grouped categories */}
          {displayed.map(({ cat, items }) => {
            const isOpen = expandedCats.has(cat)
            return (
              <div key={cat} className="bg-white border border-[#EDE9FE] rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleCat(cat)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-[#F5F3FF] transition-colors"
                >
                  {isOpen ? (
                    <ChevronDown size={16} className="text-[#7C3AED] shrink-0" />
                  ) : (
                    <ChevronRight size={16} className="text-[#7C3AED] shrink-0" />
                  )}
                  <span className="text-sm font-semibold text-[#6D28D9]">{cat}</span>
                  <span className="ml-auto text-xs font-medium text-gray-500">
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </span>
                </button>
                {isOpen && (
                  <div className="flex flex-wrap gap-2 px-3 pb-3">
                    {items.map((p) => (
                      <span
                        key={p.id}
                        className="inline-flex items-center gap-1.5 bg-[#F5F3FF] border border-[#C4B5FD] text-[#6D28D9] text-sm px-3 py-1 rounded-full"
                      >
                        {p.name}
                        <span className="font-bold text-[#7C3AED]">{p.qty} left</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
