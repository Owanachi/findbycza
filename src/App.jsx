import { useState, useEffect, useCallback } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
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
  const [sortField, setSortField] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [modalOpen, setModalOpen] = useState(false)
  const [editProduct, setEditProduct] = useState(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('products').select('*')

    if (search) {
      query = query.or(`name.ilike.%${search}%,category.ilike.%${search}%`)
    }
    if (category && category !== 'All') {
      query = query.eq('category', category)
    }
    query = query.order(sortField, { ascending: sortDir === 'asc' })

    const { data, error } = await query
    if (error) {
      toast.error('Failed to load products')
      console.error(error)
    } else {
      setProducts(data || [])
    }
    setLoading(false)
  }, [search, category, sortField, sortDir])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const categories = ['All', ...new Set(products.map((p) => p.category).filter(Boolean))]

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
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                placeholder="Search by name or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
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
