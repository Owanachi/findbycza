import { useState, useEffect, useCallback, useMemo } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import { Loader2, Search, X, SlidersHorizontal } from 'lucide-react'
import { supabase } from './lib/supabase'
import { AuthProvider, useAuth } from './lib/AuthContext'
import Dashboard from './components/Dashboard'
import ProductTable from './components/ProductTable'
import ProductModal from './components/ProductModal'
import Header from './components/Header'
import LowStockAlert from './components/LowStockAlert'
import Login from './components/Login'
import Invoices from './pages/Invoices'
import NewInvoice from './pages/NewInvoice'
import InvoiceDetail from './pages/InvoiceDetail'

const LOGO_URL = 'https://iixivpuyrxeoapsouszx.supabase.co/storage/v1/object/public/product-images/Logo.jpg'
const PAGE_SIZE_KEY = 'ffc-page-size'

function getStoredPageSize() {
  try { const v = localStorage.getItem(PAGE_SIZE_KEY); return v ? Number(v) : 10 } catch { return 10 }
}

// ─── Mobile Filter Sheet ─────────────────────────────────────────────
function FilterSheet({ onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-t-2xl shadow-2xl max-h-[80vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="font-semibold text-gray-900">Filters</h3>
          <button onClick={onClose} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
      </div>
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.25s ease-out; }
      `}</style>
    </div>
  )
}

function Inventory({ page, onNavigate }) {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [subCategory, setSubCategory] = useState('All')
  const [status, setStatus] = useState('All')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sortField, setSortField] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [modalOpen, setModalOpen] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [allCategories, setAllCategories] = useState([])
  const [allSubCategories, setAllSubCategories] = useState({})
  const [allProducts, setAllProducts] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(getStoredPageSize)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  const fetchAllProducts = useCallback(async () => {
    const { data } = await supabase.from('products').select('*')
    if (data) {
      setAllProducts(data)
      const cats = [...new Set(data.map((p) => p.category).filter(Boolean))].sort()
      setAllCategories(cats)
      const subCatMap = {}
      for (const p of data) {
        if (p.category && p.sub_category) {
          if (!subCatMap[p.category]) subCatMap[p.category] = new Set()
          subCatMap[p.category].add(p.sub_category)
        }
      }
      const sorted = {}
      for (const [cat, subs] of Object.entries(subCatMap)) {
        sorted[cat] = [...subs].sort()
      }
      setAllSubCategories(sorted)
    }
  }, [])

  useEffect(() => { fetchAllProducts() }, [fetchAllProducts])

  const hasActiveFilters = search || category !== 'All' || subCategory !== 'All' || status !== 'All' || minPrice !== '' || maxPrice !== ''

  const activeFilterCount = useMemo(() => {
    let c = 0
    if (category !== 'All') c++
    if (subCategory !== 'All') c++
    if (status !== 'All') c++
    if (minPrice !== '' || maxPrice !== '') c++
    return c
  }, [category, subCategory, status, minPrice, maxPrice])

  const fetchProducts = useCallback(async () => {
    setLoading(true)

    // For Low Stock / In Stock we need client-side filtering (involves low_stock column comparison)
    const needsClientFilter = status === 'Low Stock' || status === 'In Stock'

    let query = supabase.from('products').select('*', { count: 'exact' })

    if (search) query = query.or(`name.ilike.%${search}%,category.ilike.%${search}%`)
    if (category !== 'All') query = query.eq('category', category)
    if (subCategory !== 'All') query = query.eq('sub_category', subCategory)
    if (minPrice !== '') query = query.gte('price', Number(minPrice))
    if (maxPrice !== '') query = query.lte('price', Number(maxPrice))
    if (status === 'Out of Stock') query = query.eq('qty', 0)

    query = query.order(sortField, { ascending: sortDir === 'asc' })

    if (!needsClientFilter) {
      const from = (currentPage - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)
    }

    const { data, count, error } = await query
    if (error) {
      toast.error('Failed to load products')
      console.error(error)
    } else {
      let filtered = data || []
      if (status === 'Low Stock') {
        filtered = filtered.filter((p) => p.qty > 0 && p.qty <= p.low_stock)
      } else if (status === 'In Stock') {
        filtered = filtered.filter((p) => p.qty > p.low_stock)
      }

      if (needsClientFilter) {
        setTotalCount(filtered.length)
        const from = (currentPage - 1) * pageSize
        setProducts(filtered.slice(from, from + pageSize))
      } else {
        setTotalCount(count || filtered.length)
        setProducts(filtered)
      }
    }
    setLoading(false)
  }, [search, category, subCategory, status, minPrice, maxPrice, sortField, sortDir, currentPage, pageSize])

  // Reset to page 1 when filters/search/sort change
  useEffect(() => { setCurrentPage(1) }, [search, category, subCategory, status, minPrice, maxPrice, sortField, sortDir])

  useEffect(() => {
    if (hasActiveFilters) fetchProducts()
    else { setProducts([]); setTotalCount(0) }
  }, [hasActiveFilters, fetchProducts])

  const clearFilters = () => {
    setSearch(''); setCategory('All'); setSubCategory('All'); setStatus('All'); setMinPrice(''); setMaxPrice('')
  }

  const subCategories = category !== 'All' && allSubCategories[category] ? ['All', ...allSubCategories[category]] : ['All']

  const handleCategoryChange = (value) => { setCategory(value); setSubCategory('All') }
  const handleAdd = () => { setEditProduct(null); setModalOpen(true) }
  const handleEdit = (product) => { setEditProduct(product); setModalOpen(true) }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) { toast.error('Delete failed') } else { toast.success('Product deleted'); fetchAllProducts(); if (hasActiveFilters) fetchProducts() }
  }

  const DUPLICATE_MSG = 'A product with this name already exists in this category. Please use a different name or check existing inventory.'

  const handleSave = async (product) => {
    const nameKey = (product.name || '').trim().toLowerCase()
    const catKey = (product.category || '').trim().toLowerCase()
    const subKey = (product.sub_category || '').trim().toLowerCase()

    let dupQuery = supabase.from('products').select('id').ilike('name', nameKey).ilike('category', catKey)
    if (subKey) { dupQuery = dupQuery.ilike('sub_category', subKey) }
    else { dupQuery = dupQuery.or('sub_category.is.null,sub_category.eq.') }
    const { data: dups } = await dupQuery
    if (dups && dups.some((d) => !editProduct || d.id !== editProduct.id)) { toast.error(DUPLICATE_MSG); return }

    const productWithUser = { ...product, updated_by: user?.email || null }
    if (editProduct) {
      const { error } = await supabase.from('products').update(productWithUser).eq('id', editProduct.id)
      if (error) { toast.error(error.code === '23505' ? DUPLICATE_MSG : 'Update failed'); return }
      toast.success('Product updated')
    } else {
      const { error } = await supabase.from('products').insert([productWithUser])
      if (error) { toast.error(error.code === '23505' ? DUPLICATE_MSG : 'Insert failed'); return }
      toast.success('Product added')
    }
    setModalOpen(false); fetchAllProducts(); if (hasActiveFilters) fetchProducts()
  }

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('asc') }
  }

  const handlePageSizeChange = (size) => {
    setPageSize(size)
    setCurrentPage(1)
    try { localStorage.setItem(PAGE_SIZE_KEY, String(size)) } catch {}
  }

  const lowStockProducts = allProducts.filter((p) => p.qty <= p.low_stock)

  const filterSelectClass = 'w-full md:w-auto px-3 py-2.5 border border-[#EDE9FE] rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-[#7C3AED] outline-none bg-white text-base md:text-sm md:min-w-[160px]'

  const filterControls = (
    <>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1 md:hidden">Category</label>
        <select value={category} onChange={(e) => handleCategoryChange(e.target.value)} className={filterSelectClass}>
          <option value="All">All Categories</option>
          {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1 md:hidden">Sub-Category</label>
        <select value={subCategory} onChange={(e) => setSubCategory(e.target.value)} disabled={category === 'All'} className={`${filterSelectClass} disabled:opacity-50 disabled:cursor-not-allowed`}>
          <option value="All">All Sub-Categories</option>
          {subCategories.filter((s) => s !== 'All').map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1 md:hidden">Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={filterSelectClass}>
          <option value="All">All Status</option>
          <option value="In Stock">In Stock</option>
          <option value="Low Stock">Low Stock</option>
          <option value="Out of Stock">Out of Stock</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1 md:hidden">Price Range</label>
        <div className="flex items-center gap-2">
          <input type="number" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} min="0" className="w-full md:w-24 px-3 py-2.5 md:py-2 border border-[#EDE9FE] rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-[#7C3AED] outline-none text-base md:text-sm" />
          <span className="text-gray-400">—</span>
          <input type="number" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} min="0" className="w-full md:w-24 px-3 py-2.5 md:py-2 border border-[#EDE9FE] rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-[#7C3AED] outline-none text-base md:text-sm" />
        </div>
      </div>
      {hasActiveFilters && (
        <button onClick={() => { clearFilters(); setFilterSheetOpen(false) }} className="w-full md:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2.5 md:py-2 text-sm text-[#7C3AED] hover:bg-[#EDE9FE] border border-[#EDE9FE] rounded-lg transition-colors">
          <X size={14} /> Clear All Filters
        </button>
      )}
    </>
  )

  return (
    <div className="min-h-screen bg-white">
      <Header onAdd={handleAdd} page={page} onNavigate={onNavigate} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <Dashboard products={allProducts} />

        {lowStockProducts.length > 0 && <LowStockAlert products={lowStockProducts} />}

        {/* Search / filters */}
        <div className="mt-8 md:mt-10 flex flex-col items-center text-center">
          <img
            src={LOGO_URL}
            alt="Fabulous Finds by Za"
            className="w-20 h-20 md:w-[120px] md:h-[120px] rounded-full object-cover shadow-lg ring-4 ring-[#EDE9FE]"
          />
          <h2 className="mt-4 md:mt-5 text-xl md:text-2xl font-bold text-[#7C3AED]">
            Search or filter to explore your inventory
          </h2>
          <p className="mt-1 text-sm text-gray-500">Find products by name, category, status, or price range.</p>

          <div className="mt-4 md:mt-6 w-full max-w-2xl">
            <div className="relative">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7C3AED]" />
              <input
                type="text"
                placeholder="Search products by name or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 md:py-4 text-base bg-white border-2 border-[#EDE9FE] rounded-2xl shadow-sm focus:ring-4 focus:ring-[#EDE9FE] focus:border-[#7C3AED] outline-none transition-all"
              />
            </div>
          </div>

          {/* Mobile: Filter button */}
          <div className="mt-3 md:hidden w-full max-w-2xl">
            <button
              onClick={() => setFilterSheetOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-[#7C3AED] bg-[#F5F3FF] border border-[#EDE9FE] rounded-xl transition-colors"
            >
              <SlidersHorizontal size={16} />
              Filters{activeFilterCount > 0 && ` (${activeFilterCount})`}
            </button>
          </div>

          {/* Desktop: inline filters */}
          <div className="hidden md:flex mt-4 w-full max-w-3xl flex-wrap justify-center gap-3">
            {filterControls}
          </div>
        </div>

        {/* Results */}
        {hasActiveFilters && (
          <div className="mt-6 md:mt-10 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1 bg-[#EDE9FE] text-[#7C3AED] px-3 py-1.5 rounded-full font-semibold text-sm">
                {loading ? 'Searching…' : `${totalCount} ${totalCount === 1 ? 'result' : 'results'} found`}
              </span>
              <button onClick={clearFilters} className="text-sm text-[#7C3AED] hover:text-[#6D28D9] font-medium underline-offset-2 hover:underline">
                Clear All Filters
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-[#EDE9FE] overflow-hidden">
              <ProductTable
                products={products}
                loading={loading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
                totalCount={totalCount}
                page={currentPage}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
          </div>
        )}
      </main>

      {modalOpen && <ProductModal product={editProduct} onSave={handleSave} onClose={() => setModalOpen(false)} />}

      {filterSheetOpen && <FilterSheet onClose={() => setFilterSheetOpen(false)}>{filterControls}</FilterSheet>}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.35s ease-out; }
      `}</style>
    </div>
  )
}

function AppShell() {
  const { user, loading } = useAuth()
  const resolveRoute = useCallback(() => {
    const hash = window.location.hash.replace('#/', '')
    if (hash === 'invoices/new') return { page: 'invoices/new' }
    const detailMatch = hash.match(/^invoices\/(.+)$/)
    if (detailMatch) return { page: 'invoices/detail', invoiceId: detailMatch[1] }
    if (hash === 'invoices') return { page: 'invoices' }
    if (hash === 'preorders') return { page: 'preorders' }
    return { page: 'inventory' }
  }, [])

  const [route, setRoute] = useState(resolveRoute)
  const pg = route.page

  const handleNavigate = useCallback((target) => {
    setRoute({ page: target })
    window.location.hash = target === 'inventory' ? '/' : `/${target}`
  }, [])

  useEffect(() => {
    function onHashChange() { setRoute(resolveRoute()) }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [resolveRoute])

  if (loading) {
    return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 size={36} className="animate-spin text-[#7C3AED]" /></div>
  }

  if (!user) return <Login />

  if (pg === 'invoices/new') return <div className="min-h-screen bg-white"><Header page="invoices" onNavigate={handleNavigate} /><NewInvoice /></div>
  if (pg === 'invoices/detail') return <div className="min-h-screen bg-white"><Header page="invoices" onNavigate={handleNavigate} /><InvoiceDetail invoiceId={route.invoiceId} /></div>
  if (pg === 'invoices') return <div className="min-h-screen bg-white"><Header page="invoices" onNavigate={handleNavigate} /><Invoices onNavigate={handleNavigate} /></div>
  if (pg === 'preorders') return <div className="min-h-screen bg-white"><Header page="preorders" onNavigate={handleNavigate} /><Invoices onNavigate={handleNavigate} preorderOnly /></div>

  return <Inventory page={pg} onNavigate={handleNavigate} />
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <AppShell />
    </AuthProvider>
  )
}
