import { useState, useEffect, useCallback } from 'react'
import { Pencil, Trash2, ChevronUp, ChevronDown, Loader2, X, Eye, Search } from 'lucide-react'

const columns = [
  { key: 'name', label: 'Product', sortable: true, width: 'min-w-[260px] w-[30%]' },
  { key: 'category', label: 'Category', sortable: true, width: 'min-w-[120px] w-[13%]' },
  { key: 'sub_category', label: 'Sub-Category', sortable: true, width: 'min-w-[120px] w-[13%]' },
  { key: 'rs_price', label: 'RS Price', sortable: true, width: 'min-w-[100px] w-[10%]' },
  { key: 'price', label: 'Price', sortable: true, width: 'min-w-[100px] w-[10%]' },
  { key: 'qty', label: 'Quantity', sortable: true, width: 'min-w-[90px] w-[8%]' },
  { key: 'status', label: 'Status', sortable: false, width: 'min-w-[110px] w-[10%]' },
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
    <ChevronUp size={14} className="text-purple-600" />
  ) : (
    <ChevronDown size={14} className="text-purple-600" />
  )
}

function ProductImage({ img, name, size = 'sm' }) {
  const sizeClass = size === 'lg' ? 'w-full h-64' : 'w-10 h-10'
  const roundClass = size === 'lg' ? 'rounded-xl' : 'rounded-lg'

  if (isHttpUrl(img)) {
    return (
      <img
        src={img}
        alt={name}
        className={`${sizeClass} ${roundClass} object-cover`}
      />
    )
  }
  if (img && img.trim()) {
    return (
      <div className={`${sizeClass} ${roundClass} bg-indigo-50 flex items-center justify-center ${size === 'lg' ? 'text-6xl' : 'text-xl'}`}>
        {img}
      </div>
    )
  }
  return (
    <div className={`${sizeClass} ${roundClass} bg-gray-100 flex items-center justify-center ${size === 'lg' ? 'text-6xl' : 'text-xl'}`}>
      🛍️
    </div>
  )
}

function ImageLightbox({ img, name, onClose }) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md cursor-pointer"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[70] p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
      >
        <X size={24} />
      </button>

      <div
        className="relative max-w-[90vw] max-h-[85vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {isHttpUrl(img) ? (
          <img
            src={img}
            alt={name}
            className="max-w-full max-h-[78vh] object-contain rounded-xl shadow-2xl"
          />
        ) : img && img.trim() ? (
          <div className="w-80 h-80 rounded-xl bg-indigo-50 flex items-center justify-center text-9xl">
            {img}
          </div>
        ) : (
          <div className="w-80 h-80 rounded-xl bg-gray-100 flex items-center justify-center text-9xl">
            🛍️
          </div>
        )}
        <p className="mt-4 text-white text-lg font-semibold text-center drop-shadow-lg">{name}</p>
      </div>
    </div>
  )
}

function DetailModal({ product, onClose, onEdit, onDelete }) {
  const p = product
  const isOut = p.qty === 0
  const isLow = !isOut && p.qty <= p.low_stock
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      if (lightboxOpen) {
        setLightboxOpen(false)
      } else {
        onClose()
      }
    }
  }, [onClose, lightboxOpen])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Side panel */}
      <div
        className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Product Details</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Image */}
        <div className="px-6 pt-5">
          <div
            className="relative group cursor-pointer overflow-hidden rounded-xl"
            onClick={() => setLightboxOpen(true)}
          >
            <ProductImage img={p.img} name={p.name} size="lg" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center rounded-xl">
              <Search size={32} className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg" />
            </div>
            <style>{`
              .group:hover img, .group:hover .w-full.h-64 {
                transform: scale(1.05);
                transition: transform 0.3s ease;
              }
              .group img, .group .w-full.h-64 {
                transition: transform 0.3s ease;
              }
            `}</style>
          </div>
        </div>

        {lightboxOpen && (
          <ImageLightbox
            img={p.img}
            name={p.name}
            onClose={() => setLightboxOpen(false)}
          />
        )}

        {/* Description */}
        <div className="px-6 pt-4">
          <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-1">Description</div>
          {p.description ? (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{p.description}</p>
          ) : (
            <p className="text-sm text-gray-400 italic">No description provided.</p>
          )}
        </div>

        {/* Info */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{p.name}</h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full">
                {p.category}
              </span>
              {p.sub_category && (
                <span className="inline-block bg-gray-50 text-gray-500 text-xs px-2.5 py-1 rounded-full">
                  {p.sub_category}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Price</div>
              <div className="text-lg font-semibold text-gray-900 mt-0.5">₱{Number(p.price).toFixed(2)}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">RS Price</div>
              <div className="text-lg font-semibold text-gray-900 mt-0.5">
                {p.rs_price != null ? `₱${Number(p.rs_price).toFixed(2)}` : '—'}
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Quantity</div>
              <div className="text-lg font-semibold text-gray-900 mt-0.5">{p.qty}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Status</div>
              <div className="mt-1">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                    isOut ? 'bg-gray-100 text-gray-600' : isLow ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isOut ? 'bg-gray-400' : isLow ? 'bg-red-500' : 'bg-green-500'}`} />
                  {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                </span>
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Remarks</div>
            <div className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
              {p.remarks || '—'}
            </div>
          </div>

          {/* Last Updated */}
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Last Updated</div>
            {p.updated_by ? (
              <div className="mt-1">
                <div className="text-sm font-medium text-gray-900">{p.updated_by}</div>
                <div className="text-xs text-gray-500 mt-0.5">{formatFullDate(p.updated_at)}</div>
              </div>
            ) : (
              <div className="text-sm text-gray-400 mt-1">—</div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3">
          <button
            onClick={() => { onClose(); onEdit(p) }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#7C3AED] text-white text-sm font-medium rounded-xl hover:bg-[#6D28D9] transition-colors"
          >
            <Pencil size={16} />
            Edit Product
          </button>
          <button
            onClick={() => { onClose(); onDelete(p.id) }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-red-600 text-sm font-medium rounded-xl border border-red-200 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slideIn 0.25s ease-out;
        }
      `}</style>
    </div>
  )
}

const tableFadeCss = `
@keyframes tableFadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-table-fade { animation: tableFadeIn 0.35s ease-out; }
`

export default function ProductTable({ products, loading, onEdit, onDelete, sortField, sortDir, onSort }) {
  const [detailProduct, setDetailProduct] = useState(null)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-[#7C3AED]" />
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-lg">No products found</p>
        <p className="text-sm mt-1">Try adjusting your filters</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto animate-table-fade">
      <style>{tableFadeCss}</style>
      {detailProduct && (
        <DetailModal
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
      <table className="w-full text-sm text-left">
        <thead className="sticky top-0 z-10" style={{ background: 'linear-gradient(135deg, #7C3AED, #9F67F7)' }}>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3.5 text-xs font-bold text-white uppercase tracking-wider ${col.width} ${col.sortable ? 'cursor-pointer select-none hover:text-white/90' : ''}`}
                onClick={() => col.sortable && onSort(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortable && <SortIcon field={col.key} sortField={sortField} sortDir={sortDir} />}
                </span>
              </th>
            ))}
            <th className="px-4 py-3.5 text-xs font-bold text-white uppercase tracking-wider min-w-[100px] w-[6%]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => {
            const isOut = p.qty === 0
            const isLow = !isOut && p.qty <= p.low_stock
            const badgeClass = isOut
              ? 'bg-gray-100 text-gray-600'
              : isLow
              ? 'bg-red-50 text-red-700'
              : 'bg-green-50 text-green-700'
            const dotClass = isOut ? 'bg-gray-400' : isLow ? 'bg-red-500' : 'bg-green-500'
            const badgeLabel = isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'
            return (
              <tr
                key={p.id}
                className={`border-b border-[#EDE9FE] hover:bg-[#EDE9FE]/60 transition-colors cursor-pointer ${
                  i % 2 === 1 ? 'bg-[#F5F3FF]' : 'bg-white'
                }`}
                onClick={() => setDetailProduct(p)}
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0">
                      <ProductImage img={p.img} name={p.name} />
                    </div>
                    <span className="font-bold text-[#7C3AED] truncate">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="inline-block bg-[#EDE9FE] text-[#7C3AED] text-xs font-medium px-2.5 py-1 rounded-full">
                    {p.category}
                  </span>
                </td>
                <td className="px-4 py-4 text-gray-500 text-xs">{p.sub_category || '—'}</td>
                <td className="px-4 py-4 font-medium text-gray-500">
                  {p.rs_price != null ? `₱${Number(p.rs_price).toFixed(2)}` : '—'}
                </td>
                <td className="px-4 py-4 font-medium text-gray-900">₱{Number(p.price).toFixed(2)}</td>
                <td className="px-4 py-4 font-medium text-gray-900">{p.qty}</td>
                <td className="px-4 py-4">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${badgeClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                    {badgeLabel}
                  </span>
                </td>
                <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setDetailProduct(p)}
                      className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => onEdit(p)}
                      className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
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
