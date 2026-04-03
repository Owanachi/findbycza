import { Package, AlertTriangle, Layers } from 'lucide-react'

export default function Dashboard({ products }) {
  const totalProducts = products.length
  const totalValue = products.reduce((sum, p) => sum + p.price * p.qty, 0)
  const lowStock = products.filter((p) => p.qty <= p.low_stock).length
  const categories = new Set(products.map((p) => p.category).filter(Boolean)).size

  const stats = [
    {
      label: 'Total Products',
      value: totalProducts,
      icon: Package,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Inventory Value',
      value: `₱${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      iconText: '₱',
      color: 'bg-green-50 text-green-600',
    },
    {
      label: 'Low Stock Items',
      value: lowStock,
      icon: AlertTriangle,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Categories',
      value: categories,
      icon: Layers,
      color: 'bg-purple-50 text-purple-600',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-white rounded-xl p-5 shadow-sm border border-gray-200"
        >
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${s.color}`}>
              {s.iconText ? (
                <span className="text-2xl font-bold leading-none">{s.iconText}</span>
              ) : (
                <s.icon size={22} />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
