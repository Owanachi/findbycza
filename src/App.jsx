import { useState, useEffect, useCallback } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import { Loader2, Search, X } from 'lucide-react'
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

const LOGO_URL = 'https://iixivpuyrxeoapsouszx.supabase.co/storage/v1/object/public/product-images/Logo.jpg'

function Inventory({ page, onNavigate }) {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
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

  // Fetch all products once (for dashboard stats + filter options)
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

  useEffect(() => {
    fetchAllProducts()
  }, [fetchAllProducts])

  const hasActiveFilters =
    search || category !== 'All' || subCategory !== 'All' || status !== 'All' || minPrice !== '' || maxPrice !== ''

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('products').select('*')

    if (search) {
      query = query.or(`name.ilike.%${search}%,category.ilike.%${search}%`)
    }
    if (category && category !== 'All') {
      query = query.eq('category', category)
    }
    if (subCategory && subCategory !== 'All') {
      query = query.eq('sub_category', subCategory)
    }
    if (minPrice !== '') {
      query = query.gte('price', Number(minPrice))
    }
    if (maxPrice !== '') {
      query = query.lte('price', Number(maxPrice))
    }
    if (status === 'Out of Stock') {
      query = query.eq('qty', 0)
    }
    query = query.order(sortField, { ascending: sortDir === 'asc' })

    const { data, error } = await query
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
      setProducts(filtered)
    }
    setLoading(false)
  }, [search, category, subCategory, status, minPrice, maxPrice, sortField, sortDir])

  useEffect(() => {
    if (hasActiveFilters) {
      fetchProducts()
    } else {
      setProducts([])
    }
  }, [hasActiveFilters, fetchProducts])

  const clearFilters = () => {
    setSearch('')
    setCategory('All')
    setSubCategory('All')
    setStatus('All')
    setMinPrice('')
    setMaxPrice('')
  }

  const subCategories =
    category !== 'All' && allSubCategories[category] ? ['All', ...allSubCategories[category]] : ['All']

  const handleCategoryChange = (value) => {
    setCategory(value)
    setSubCategory('All')
  }

  const handleAdd = () => {
    setEditProduct(null)
    setModalOpen(true)
  }

  const handleEdit = (product) => {
    setEditProduct(product)
    setModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) {
      toast.error('Delete failed')
    } else {
      toast.success('Product deleted')
      fetchAllProducts()
      if (hasActiveFilters) fetchProducts()
    }
  }

  const handleSave = async (product) => {
    const productWithUser = { ...product, updated_by: user?.email || null }
    if (editProduct) {
      const { error } = await supabase.from('products').update(productWithUser).eq('id', editProduct.id)
      if (error) {
        toast.error('Update failed')
        return
      }
      toast.success('Product updated')
    } else {
      const { error } = await supabase.from('products').insert([productWithUser])
      if (error) {
        toast.error('Insert failed')
        return
      }
      toast.success('Product added')
    }
    setModalOpen(false)
    fetchAllProducts()
    if (hasActiveFilters) fetchProducts()
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const lowStockProducts = allProducts.filter((p) => p.qty <= p.low_stock)

  const filterSelectClass =
    'px-3 py-2.5 border border-[#EDE9FE] rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-[#7C3AED] outline-none bg-white text-sm min-w-[160px]'

  return (
    <div className="min-h-screen bg-white">
      <Header onAdd={handleAdd} page={page} onNavigate={onNavigate} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Dashboard products={allProducts} />

        {lowStockProducts.length > 0 && <LowStockAlert products={lowStockProducts} />}

        {/* Centered search / filters */}
        <div className="mt-10 flex flex-col items-center text-center">
          <img
            src={LOGO_URL}
            alt="Fabulous Finds by Cza"
            className="w-[120px] h-[120px] rounded-full object-cover shadow-lg ring-4 ring-[#EDE9FE]"
          />
          <h2 className="mt-5 text-2xl font-bold text-[#7C3AED]">
            Search or filter to explore your inventory
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Find products by name, category, status, or price range.
          </p>

          <div className="mt-6 w-full max-w-2xl">
            <div className="relative">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7C3AED]" />
              <input
                type="text"
                placeholder="Search products by name or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-4 text-base bg-white border-2 border-[#EDE9FE] rounded-2xl shadow-sm focus:ring-4 focus:ring-[#EDE9FE] focus:border-[#7C3AED] outline-none transition-all"
              />
            </div>
          </div>

          <div className="mt-4 w-full max-w-3xl flex flex-wrap justify-center gap-3">
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className={filterSelectClass}
            >
              <option value="All">All Categories</option>
              {allCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              disabled={category === 'All'}
              className={`${filterSelectClass} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <option value="All">All Sub-Categories</option>
              {subCategories
                .filter((s) => s !== 'All')
                .map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={filterSelectClass}>
              <option value="All">All Status</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">Price:</span>
            <input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              min="0"
              className="w-24 px-3 py-2 border border-[#EDE9FE] rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-[#7C3AED] outline-none text-sm"
            />
            <span className="text-gray-400">—</span>
            <input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              min="0"
              className="w-24 px-3 py-2 border border-[#EDE9FE] rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-[#7C3AED] outline-none text-sm"
            />
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="ml-2 inline-flex items-center gap-1.5 px-3 py-2 text-sm text-[#7C3AED] hover:bg-[#EDE9FE] border border-[#EDE9FE] rounded-lg transition-colors"
              >
                <X size={14} />
                Clear All Filters
              </button>
            )}
          </div>
        </div>

        {/* Results (table) — shown only when filters active */}
        {hasActiveFilters && (
          <div className="mt-10 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1 bg-[#EDE9FE] text-[#7C3AED] px-3 py-1.5 rounded-full font-semibold text-sm">
                {loading ? 'Searching…' : `${products.length} ${products.length === 1 ? 'result' : 'results'} found`}
              </span>
              <button
                onClick={clearFilters}
                className="text-sm text-[#7C3AED] hover:text-[#6D28D9] font-medium underline-offset-2 hover:underline"
              >
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
              />
            </div>
          </div>
        )}
      </main>

      {modalOpen && (
        <ProductModal product={editProduct} onSave={handleSave} onClose={() => setModalOpen(false)} />
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.35s ease-out;
        }
      `}</style>
    </div>
  )
}

function AppShell() {
  const { user, loading } = useAuth()
  const resolveRoute = useCallback(() => {
    const hash = window.location.hash.replace('#/', '')
    if (hash === 'invoices/new') return 'invoices/new'
    if (hash === 'invoices' || hash.startsWith('invoices/')) return 'invoices'
    return 'inventory'
  }, [])

  const [page, setPage] = useState(resolveRoute)

  const handleNavigate = useCallback((target) => {
    setPage(target)
    window.location.hash = target === 'inventory' ? '/' : `/${target}`
  }, [])

  useEffect(() => {
    function onHashChange() {
      setPage(resolveRoute())
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [resolveRoute])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 size={36} className="animate-spin text-[#7C3AED]" />
      </div>
    )
  }

  if (!user) return <Login />

  if (page === 'invoices/new') {
    return (
      <div className="min-h-screen bg-white">
        <Header page="invoices" onNavigate={handleNavigate} />
        <NewInvoice />
      </div>
    )
  }

  if (page === 'invoices') {
    return (
      <div className="min-h-screen bg-white">
        <Header page={page} onNavigate={handleNavigate} />
        <Invoices onNavigate={handleNavigate} />
      </div>
    )
  }

  return <Inventory page={page} onNavigate={handleNavigate} />
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <AppShell />
    </AuthProvider>
  )
}
