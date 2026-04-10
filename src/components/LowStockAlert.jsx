import { AlertTriangle } from 'lucide-react'

export default function LowStockAlert({ products }) {
  return (
    <div className="mt-6 bg-[#F5F3FF] border border-[#EDE9FE] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={18} className="text-[#7C3AED]" />
        <h3 className="font-semibold text-[#7C3AED]">Low Stock Alerts</h3>
        <span className="ml-auto bg-[#7C3AED] text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {products.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
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
    </div>
  )
}
