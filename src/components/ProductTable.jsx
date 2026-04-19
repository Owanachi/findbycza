import { useState, useEffect, useCallback } from 'react'
import { Pencil, Trash2, ChevronUp, ChevronDown, Loader2, X, Eye, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Camera } from 'lucide-react'

const columns = [
  { key: 'name', label: 'Product', sortable: true, width: 'min-w-[260px] w-[30%]' },
  { key: 'category', label: 'Category', sortable: true, width: 'min-w-[120px] w-[13%]' },
  { key: 'sub_category', label: 'Sub-Category', sortable: true, width: 'min-w-[120px] w-[13%]' },
  { key: 'price', label: 'Price', sortable: true, width: 'min-w-[100px] w-[10%]' },
  { key: 'rs_price', label: 'RS Price', sortable: true, width: 'min-w-[100px] w-[10%]' },
  { key: 'qty', label: 'Quantity', sortable: true, width: 'min-w-[90px] w-[8%]' },
  { key: 'status', label: 'Status', sortable: false, width: 'min-w-[110px] w-[10%]' },
]

const PAGE_SIZE_KEY = 'ffc-page-size'

function formatFullDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    + ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
}

function isHttpUrl(str) {
  return typeof str === 'string' && str.startsWith('http')
}

// Get all image URLs for a product, preferring image_urls array
function getProductImages(product) {
  if (product.image_urls && Array.isArray(product.image_urls) && product.image_urls.length > 0) {
    return product.image_urls.filter(Boolean)
  }
  if (product.img && isHttpUrl(product.img)) return [product.img]
  if (product.img && product.img.trim()) return [product.img] // emoji
  return []
}

// Get cover image (first image)
function getCoverImage(product) {
  const imgs = getProductImages(product)
  return imgs[0] || null
}

function SortIcon({ field, sortField, sortDir }) {
  if (field !== sortField) return <ChevronUp size={14} className="text-gray-300" />
  return sortDir === 'asc' ? (
    <ChevronUp size={14} className="text-purple-600" />
  ) : (
    <ChevronDown size={14} className="text-purple-600" />
  )
}

function ProductImage({ product, size = 'sm' }) {
  const cover = getCoverImage(product)
  const imageCount = getProductImages(product).length
  const sizeClass = size === 'lg' ? 'w-full h-64' : 'w-10 h-10'
  const roundClass = size === 'lg' ? 'rounded-xl' : 'rounded-lg'

  if (isHttpUrl(cover)) {
    return (
      <div className="relative inline-block">
        <img src={cover} alt={product.name} className={`${sizeClass} ${roundClass} object-cover`} />
        {size === 'sm' && imageCount > 1 && (
          <span className="absolute -bottom-1 -right-1 bg-[#7C3AED] text-white text-[9px] font-bold px-1 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
            <Camera size={8} />{imageCount}
          </span>
        )}
      </div>
    )
  }
  if (cover && cover.trim()) {
    return <div className={`${sizeClass} ${roundClass} bg-indigo-50 flex items-center justify-center ${size === 'lg' ? 'text-6xl' : 'text-xl'}`}>{cover}</div>
  }
  return <div className={`${sizeClass} ${roundClass} bg-gray-100 flex items-center justify-center ${size === 'lg' ? 'text-6xl' : 'text-xl'}`}>🛍️</div>
}

function ImageLightbox({ images, currentIndex, name, onClose, onChangeIndex }) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && currentIndex > 0) onChangeIndex(currentIndex - 1)
      if (e.key === 'ArrowRight' && currentIndex < images.length - 1) onChangeIndex(currentIndex + 1)
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = '' }
  }, [onClose, currentIndex, images.length, onChangeIndex])

  const img = images[currentIndex]

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md cursor-pointer" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 z-[70] p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors">
        <X size={24} />
      </button>
      <div className="relative max-w-[90vw] max-h-[85vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
        {/* Nav arrows */}
        {images.length > 1 && currentIndex > 0 && (
          <button onClick={() => onChangeIndex(currentIndex - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 z-[70] p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors">
            <ChevronLeft size={28} />
          </button>
        )}
        {images.length > 1 && currentIndex < images.length - 1 && (
          <button onClick={() => onChangeIndex(currentIndex + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 z-[70] p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors">
            <ChevronRight size={28} />
          </button>
        )}

        {isHttpUrl(img) ? (
          <img src={img} alt={name} className="max-w-full max-h-[78vh] object-contain rounded-xl shadow-2xl" />
        ) : img && img.trim() ? (
          <div className="w-80 h-80 rounded-xl bg-indigo-50 flex items-center justify-center text-9xl">{img}</div>
        ) : (
          <div className="w-80 h-80 rounded-xl bg-gray-100 flex items-center justify-center text-9xl">🛍️</div>
        )}
        <p className="mt-4 text-white text-lg font-semibold text-center drop-shadow-lg">{name}</p>
        {images.length > 1 && (
          <p className="mt-1 text-white/60 text-sm">{currentIndex + 1} / {images.length}</p>
        )}
      </div>
    </div>
  )
}

// ─── Image Gallery / Carousel ───────────────────────────────────────
function ImageGallery({ product, onLightbox }) {
  const images = getProductImages(product)
  const [currentIdx, setCurrentIdx] = useState(0)

  if (images.length === 0) {
    return (
      <div className="w-full h-64 rounded-xl bg-gray-100 flex items-center justify-center text-6xl">🛍️</div>
    )
  }

  const current = images[currentIdx]

  return (
    <div>
      {/* Main image */}
      <div className="relative group cursor-pointer overflow-hidden rounded-xl" onClick={() => onLightbox(currentIdx)}>
        {isHttpUrl(current) ? (
          <img src={current} alt={product.name} className="w-full h-64 rounded-xl object-cover" />
        ) : (
          <div className="w-full h-64 rounded-xl bg-indigo-50 flex items-center justify-center text-6xl">{current}</div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center rounded-xl">
          <Search size={32} className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg" />
        </div>
        {/* Prev/Next arrows on main image */}
        {images.length > 1 && currentIdx > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); setCurrentIdx((i) => i - 1) }}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1 bg-black/30 hover:bg-black/50 text-white rounded-full transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        {images.length > 1 && currentIdx < images.length - 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); setCurrentIdx((i) => i + 1) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-black/30 hover:bg-black/50 text-white rounded-full transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        )}
      </div>

      {/* Thumbnails strip */}
      {images.length > 1 && (
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIdx(idx)}
              className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                idx === currentIdx ? 'border-[#7C3AED] ring-2 ring-[#7C3AED]/30' : 'border-transparent hover:border-gray-300'
              }`}
            >
              {isHttpUrl(img) ? (
                <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-indigo-50 flex items-center justify-center text-lg">{img}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function DetailModal({ product, onClose, onEdit, onDelete }) {
  const p = product
  const isOut = p.qty === 0
  const isLow = !isOut && p.qty <= p.low_stock
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState(0)
  const images = getProductImages(p)

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      if (lightboxOpen) setLightboxOpen(false)
      else onClose()
    }
  }, [onClose, lightboxOpen])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handleKeyDown); document.body.style.overflow = '' }
  }, [handleKeyDown])

  function openLightbox(idx) {
    setLightboxIdx(idx)
    setLightboxOpen(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex md:justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full md:max-w-md bg-white shadow-2xl overflow-y-auto animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Product Details</h2>
          <button onClick={onClose} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 pt-5">
          <ImageGallery product={p} onLightbox={openLightbox} />
        </div>

        {lightboxOpen && (
          <ImageLightbox
            images={images}
            currentIndex={lightboxIdx}
            name={p.name}
            onClose={() => setLightboxOpen(false)}
            onChangeIndex={setLightboxIdx}
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

        <div className="px-6 py-5 space-y-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{p.name}</h3>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full">{p.category}</span>
              {p.sub_category && <span className="inline-block bg-gray-50 text-gray-500 text-xs px-2.5 py-1 rounded-full">{p.sub_category}</span>}
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
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${isOut ? 'bg-gray-100 text-gray-600' : isLow ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isOut ? 'bg-gray-400' : isLow ? 'bg-red-500' : 'bg-green-500'}`} />
                  {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Remarks</div>
            <div className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{p.remarks || '—'}</div>
          </div>

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

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3">
          <button
            onClick={() => { onClose(); onEdit(p) }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#7C3AED] text-white text-sm font-medium rounded-xl hover:bg-[#6D28D9] transition-colors min-h-[44px]"
          >
            <Pencil size={16} /> Edit Product
          </button>
          <button
            onClick={() => { onClose(); onDelete(p.id) }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-red-600 text-sm font-medium rounded-xl border border-red-200 hover:bg-red-50 transition-colors min-h-[44px]"
          >
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in { animation: slideIn 0.25s ease-out; }
      `}</style>
    </div>
  )
}

// ─── Pagination ──────────────────────────────────────────────────────
function Pagination({ page, totalPages, totalItems, pageSize, onPageChange, onPageSizeChange }) {
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalItems)

  const pages = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
  }

  const btnBase = 'min-w-[36px] min-h-[36px] md:min-w-[32px] md:min-h-[32px] flex items-center justify-center rounded-lg text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed'

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-[#EDE9FE]">
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <span>Showing {from}–{to} of {totalItems}</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="px-2 py-1 border border-[#EDE9FE] rounded-lg text-sm focus:ring-2 focus:ring-[#7C3AED] outline-none"
        >
          {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
        </select>
      </div>

      {/* Mobile pagination */}
      <div className="flex md:hidden items-center gap-2">
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className={`${btnBase} hover:bg-[#EDE9FE] text-[#7C3AED]`}>
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm text-gray-600 px-2">Page {page} of {totalPages}</span>
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className={`${btnBase} hover:bg-[#EDE9FE] text-[#7C3AED]`}>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Desktop pagination */}
      <div className="hidden md:flex items-center gap-1">
        <button onClick={() => onPageChange(1)} disabled={page <= 1} className={`${btnBase} hover:bg-[#EDE9FE] text-[#7C3AED]`} title="First">
          <ChevronsLeft size={16} />
        </button>
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className={`${btnBase} hover:bg-[#EDE9FE] text-[#7C3AED]`} title="Previous">
          <ChevronLeft size={16} />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`e${i}`} className="px-1 text-gray-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`${btnBase} ${p === page ? 'bg-[#7C3AED] text-white' : 'hover:bg-[#EDE9FE] text-[#7C3AED]'}`}
            >
              {p}
            </button>
          )
        )}
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className={`${btnBase} hover:bg-[#EDE9FE] text-[#7C3AED]`} title="Next">
          <ChevronRight size={16} />
        </button>
        <button onClick={() => onPageChange(totalPages)} disabled={page >= totalPages} className={`${btnBase} hover:bg-[#EDE9FE] text-[#7C3AED]`} title="Last">
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  )
}

// ─── Mobile Product Card ─────────────────────────────────────────────
function ProductCard({ product, onView, onEdit, onDelete }) {
  const p = product
  const isOut = p.qty === 0
  const isLow = !isOut && p.qty <= p.low_stock
  const badgeClass = isOut ? 'bg-gray-100 text-gray-600' : isLow ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
  const dotClass = isOut ? 'bg-gray-400' : isLow ? 'bg-red-500' : 'bg-green-500'
  const badgeLabel = isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'

  return (
    <div className="bg-white rounded-xl border border-[#EDE9FE] p-4 space-y-3" onClick={() => onView(p)}>
      <div className="flex items-start gap-3">
        <div className="shrink-0">
          <ProductImage product={p} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[#7C3AED] truncate">{p.name}</p>
          <p className="text-xs text-gray-500">{p.category}</p>
          {p.sub_category && <p className="text-xs text-gray-400">{p.sub_category}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Price:</span>
          <span className="font-medium text-gray-900">₱{Number(p.price).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">RS Price:</span>
          <span className="font-medium text-gray-500">{p.rs_price != null ? `₱${Number(p.rs_price).toFixed(2)}` : '—'}</span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Qty: <span className="font-medium">{p.qty}</span></span>
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${badgeClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
            {badgeLabel}
          </span>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onView(p)} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="View">
            <Eye size={18} />
          </button>
          <button onClick={() => onEdit(p)} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Edit">
            <Pencil size={18} />
          </button>
          <button onClick={() => onDelete(p.id)} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
            <Trash2 size={18} />
          </button>
        </div>
      </div>
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

export default function ProductTable({ products, loading, onEdit, onDelete, sortField, sortDir, onSort, totalCount, page, pageSize, onPageChange, onPageSizeChange }) {
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

  const total = totalCount ?? products.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="animate-table-fade">
      <style>{tableFadeCss}</style>
      {detailProduct && (
        <DetailModal product={detailProduct} onClose={() => setDetailProduct(null)} onEdit={onEdit} onDelete={onDelete} />
      )}

      {/* Mobile: card layout */}
      <div className="md:hidden space-y-3 p-3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} onView={setDetailProduct} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>

      {/* Desktop: table layout */}
      <div className="hidden md:block overflow-x-auto">
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
              <th className="px-4 py-3.5 text-xs font-bold text-white uppercase tracking-wider min-w-[100px] w-[6%]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => {
              const isOut = p.qty === 0
              const isLow = !isOut && p.qty <= p.low_stock
              const badgeClass = isOut ? 'bg-gray-100 text-gray-600' : isLow ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
              const dotClass = isOut ? 'bg-gray-400' : isLow ? 'bg-red-500' : 'bg-green-500'
              const badgeLabel = isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'
              return (
                <tr
                  key={p.id}
                  className={`border-b border-[#EDE9FE] hover:bg-[#EDE9FE]/60 transition-colors cursor-pointer ${i % 2 === 1 ? 'bg-[#F5F3FF]' : 'bg-white'}`}
                  onClick={() => setDetailProduct(p)}
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="shrink-0"><ProductImage product={p} /></div>
                      <span className="font-bold text-[#7C3AED] truncate">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-block bg-[#EDE9FE] text-[#7C3AED] text-xs font-medium px-2.5 py-1 rounded-full">{p.category}</span>
                  </td>
                  <td className="px-4 py-4 text-gray-500 text-xs">{p.sub_category || '—'}</td>
                  <td className="px-4 py-4 font-medium text-gray-900">₱{Number(p.price).toFixed(2)}</td>
                  <td className="px-4 py-4 font-medium text-gray-500">
                    {p.rs_price != null ? `₱${Number(p.rs_price).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-4 font-medium text-gray-900">{p.qty}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${badgeClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                      {badgeLabel}
                    </span>
                  </td>
                  <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setDetailProduct(p)} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="View Details"><Eye size={16} /></button>
                      <button onClick={() => onEdit(p)} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Edit"><Pencil size={16} /></button>
                      <button onClick={() => onDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  )
}
