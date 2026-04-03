import { useState, useEffect, useCallback } from 'react'
import { Pencil, Trash2, ChevronUp, ChevronDown, Loader2, X } from 'lucide-react'

const columns = [
  { key: 'img', label: '', sortable: false },
  { key: 'name', label: 'Product', sortable: true },
  { key: 'category', label: 'Category', sortable: true },
  { key: 'sub_category', label: 'Sub-Category', sortable: true },
  { key: 'rs_price', label: 'RS Price', sortable: true },
  { key: 'price', label: 'Price', sortable: true },
  { key: 'qty', label: 'Quantity', sortable: true },
  { key: 'remarks', label: 'Remarks', sortable: false },
  { key: 'status', label: 'Status', sortable: false },
  { key: 'updated_by', label: 'Updated By', sortable: true },
  { key: 'updated_at', label: 'Updated At', sortable: true },
]

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatFullDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    + ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
}

function isHttpUrl(str) {
  return typeof str === 'string' && str.startsWith('http')
}

function SortIcon({ field, sortField, sortDir }) {
  if (field !== sortField) return <ChevronUp size={14} className="text-gray-300" />
  return sortDir === 'asc' ? (
    <ChevronUp size={14} className="text-indigo-600" />
  ) : (
    <ChevronDown size={14} className="text-indigo-600" />
  )
}

function ProductImage({ img, name, onClick }) {
  if (isHttpUrl(img)) {
    return (
      <img
        src={img}
        alt={name}
        className="w-10 h-10 rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity"
        onClick={onClick}
      />
    )
  }
  if (img && img.trim()) {
    return (
      <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-xl">
        {img}
      </div>
    )
  }
  return (
    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xl">
      🛍️
    </div>
  )
}

function Lightbox({ src, alt, onClose }) {
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
      >
        <X size={28} />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

export default function ProductTable({ products, loading, onEdit, onDelete, sortField, sortDir, onSort }) {
  const [lightbox, setLightbox] = useState(null)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-indigo-500" />
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-lg">No products found</p>
        <p className="text-sm mt-1">Add a product or adjust your filters</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      {lightbox && (
        <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />
      )}
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider ${col.sortable ? 'cursor-pointer select-none hover:text-gray-700' : ''}`}
                onClick={() => col.sortable && onSort(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortable && <SortIcon field={col.key} sortField={sortField} sortDir={sortDir} />}
                </span>
              </th>
            ))}
            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const isLow = p.qty <= p.low_stock
            return (
              <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <ProductImage
                    img={p.img}
                    name={p.name}
                    onClick={() => {
                      if (isHttpUrl(p.img)) {
                        setLightbox({ src: p.img, alt: p.name })
                      }
                    }}
                  />
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                <td className="px-4 py-3">
                  <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full">
                    {p.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{p.sub_category || '—'}</td>
                <td className="px-4 py-3 font-medium">{p.rs_price != null ? `₱${Number(p.rs_price).toFixed(2)}` : '—'}</td>
                <td className="px-4 py-3 font-medium">₱{Number(p.price).toFixed(2)}</td>
                <td className="px-4 py-3 font-medium">{p.qty}</td>
                <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate" title={p.remarks || ''}>
                  {p.remarks || '—'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      isLow
                        ? 'bg-red-50 text-red-700'
                        : 'bg-green-50 text-green-700'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isLow ? 'bg-red-500' : 'bg-green-500'}`} />
                    {isLow ? 'Low Stock' : 'In Stock'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {p.updated_by ? (
                    <span className="relative group">
                      <span className="text-xs text-gray-600 cursor-default">{p.updated_by}</span>
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {formatFullDate(p.updated_at)}
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                  {formatDate(p.updated_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEdit(p)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(p.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
