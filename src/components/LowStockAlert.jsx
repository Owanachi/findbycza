import { AlertTriangle } from 'lucide-react'

export default function LowStockAlert({ products }) {
  return (
    <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={18} className="text-amber-600" />
        <h3 className="font-semibold text-amber-800">Low Stock Alerts</h3>
        <span className="ml-auto bg-amber-200 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full">
          {products.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {products.map((p) => (
          <span
            key={p.id}
            className="inline-flex items-center gap-1.5 bg-white border border-amber-200 text-amber-800 text-sm px-3 py-1 rounded-full"
          >
            {p.name}
            <span className="font-bold text-amber-600">{p.qty} left</span>
          </span>
        ))}
      </div>
    </div>
  )
}
