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

function Inventory() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
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

  // Fetch all distinct categories and sub-categories once on mount
  useEffect(() => {
    async function fetchFilterOptions() {
      const { data } = await supabase
        .from('products')
        .select('category, sub_category')
      if (data) {
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
    }
    fetchFilterOptions()
  }, [products])

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
      // Client-side status filtering for Low Stock / In Stock (depends on low_stock threshold)
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
    fetchProducts()
  }, [fetchProducts])

  const hasActiveFilters = search || category !== 'All' || subCategory !== 'All' || status !== 'All' || minPrice !== '' || maxPrice !== ''

  const clearFilters = () => {
    setSearch('')
    setCategory('All')
    setSubCategory('All')
    setStatus('All')
    setMinPrice('')
    setMaxPrice('')
  }

  // Get sub-categories for the currently selected category
  const subCategories = category !== 'All' && allSubCategories[category]
    ? ['All', ...allSubCategories[category]]
    : ['All']

  // Reset sub-category when category changes
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
      fetchProducts()
    }
  }

  const handleSave = async (product) => {
    if (editProduct) {
      const { error } = await supabase
        .from('products')
        .update(product)
        .eq('id', editProduct.id)
      if (error) {
        toast.error('Update failed')
        return
      }
      toast.success('Product updated')
    } else {
      const { error } = await supabase.from('products').insert([product])
      if (error) {
        toast.error('Insert failed')
        return
      }
      toast.success('Product added')
    }
    setModalOpen(false)
    fetchProducts()
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const lowStockProducts = products.filter((p) => p.qty <= p.low_stock)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onAdd={handleAdd} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Dashboard products={products} />

        {lowStockProducts.length > 0 && (
          <LowStockAlert products={lowStockProducts} />
        )}

        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 sm:p-6 border-b border-gray-200 space-y-3">
            {/* Row 1: Search + Category + Sub-Category */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                />
              </div>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-sm min-w-[160px]"
              >
                <option value="All">All Categories</option>
                {allCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                disabled={category === 'All'}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-sm min-w-[160px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="All">All Sub-Categories</option>
                {subCategories.filter((s) => s !== 'All').map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Row 2: Status + Price Range + Clear */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-sm min-w-[140px]"
              >
                <option value="All">All Status</option>
                <option value="In Stock">In Stock</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 whitespace-nowrap">Price:</span>
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  min="0"
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                />
                <span className="text-gray-400">—</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  min="0"
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                />
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 border border-gray-300 rounded-lg transition-colors"
                >
                  <X size={14} />
                  Clear Filters
                </button>
              )}
            </div>

            {/* Result count */}
            <div className="text-xs text-gray-500">
              <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                {products.length} {products.length === 1 ? 'result' : 'results'}
              </span>
            </div>
          </div>

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
      </main>

      {modalOpen && (
        <ProductModal
          product={editProduct}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}

function AppShell() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={36} className="animate-spin text-indigo-500" />
      </div>
    )
  }

  return user ? <Inventory /> : <Login />
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <AppShell />
    </AuthProvider>
  )
}
