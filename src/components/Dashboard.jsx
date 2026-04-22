import { Package, AlertTriangle, Layers, ChevronRight } from 'lucide-react'

export default function Dashboard({ products }) {
  const totalProducts = products.length
  const totalValue = products.reduce((sum, p) => sum + p.price * p.qty, 0)
  const lowStock = products.filter((p) => p.qty <= p.low_stock).length
  const categories = new Set(products.map((p) => p.category).filter(Boolean)).size

  const stats = [
    { label: 'Total Products', value: totalProducts, icon: Package },
    {
      label: 'Inventory Value',
      value: `₱${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      iconText: '₱',
    },
    { label: 'Low Stock Items', value: lowStock, icon: AlertTriangle, clickable: true },
    { label: 'Categories', value: categories, icon: Layers },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => {
        const cardInner = (
          <>
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#7C3AED]" />
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-[#EDE9FE] text-[#7C3AED]">
                {s.iconText ? (
                  <span className="text-2xl font-bold leading-none">{s.iconText}</span>
                ) : (
                  <s.icon size={22} />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">{s.label}</p>
                <p className="text-2xl font-bold text-[#7C3AED]">{s.value}</p>
              </div>
              {s.clickable && <ChevronRight size={18} className="text-[#7C3AED] opacity-60 flex-shrink-0" />}
            </div>
          </>
        )

        if (s.clickable) {
          return (
            <button
              key={s.label}
              aria-label="View low stock items"
              onClick={() => { window.location.hash = '#/inventory?filter=low-stock' }}
              className="relative bg-white rounded-xl p-5 shadow-sm border border-[#EDE9FE] overflow-hidden text-left w-full cursor-pointer hover:shadow-md hover:bg-purple-50 transition-all"
            >
              {cardInner}
            </button>
          )
        }

        return (
          <div
            key={s.label}
            className="relative bg-white rounded-xl p-5 shadow-sm border border-[#EDE9FE] overflow-hidden"
          >
            {cardInner}
          </div>
        )
      })}
    </div>
  )
}
