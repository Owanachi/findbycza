import { useState, useRef } from 'react'
import { X, Upload, ImageIcon, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const emptyForm = { name: '', category: '', sub_category: '', rs_price: '', price: '', qty: '', low_stock: '', img: '', remarks: '' }

export default function ProductModal({ product, onSave, onClose }) {
  const [form, setForm] = useState(
    product
      ? {
          name: product.name || '',
          category: product.category || '',
          sub_category: product.sub_category || '',
          rs_price: product.rs_price ?? '',
          price: product.price ?? '',
          qty: product.qty ?? '',
          low_stock: product.low_stock ?? '',
          img: product.img || '',
          remarks: product.remarks || '',
        }
      : { ...emptyForm }
  )
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(product?.img || null)
  const fileRef = useRef(null)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file)
    setPreview(localUrl)
    setUploading(true)

    const ext = file.name.split('.').pop().toLowerCase()
    const fileName = `product_${Date.now()}.${ext}`

    const { error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file, { contentType: file.type, upsert: true })

    if (error) {
      toast.error(`Upload failed: ${error.message}`)
      setPreview(form.img || null)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName)

    URL.revokeObjectURL(localUrl)
    setForm((f) => ({ ...f, img: urlData.publicUrl }))
    setPreview(urlData.publicUrl)
    setUploading(false)
    toast.success('Image uploaded')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    await onSave({
      name: form.name,
      category: form.category,
      sub_category: form.sub_category || null,
      rs_price: form.rs_price !== '' ? parseFloat(form.rs_price) : null,
      price: parseFloat(form.price) || 0,
      qty: parseInt(form.qty) || 0,
      low_stock: parseInt(form.low_stock) || 0,
      img: form.img || null,
      remarks: form.remarks || null,
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">
            {product ? 'Edit Product' : 'Add Product'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Image upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
            <div className="flex items-center gap-4">
              <div className="relative">
                {preview ? (
                  <img src={preview} alt="Preview" className={`w-20 h-20 rounded-lg object-cover border border-gray-200 ${uploading ? 'opacity-50' : ''}`} />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                    <ImageIcon size={28} />
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-indigo-600" />
                  </div>
                )}
              </div>
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  {uploading ? 'Uploading...' : 'Upload Image'}
                </button>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, or WebP</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                name="category"
                value={form.category}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sub-Category</label>
              <input
                name="sub_category"
                value={form.sub_category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RS Price (₱)</label>
              <input
                name="rs_price"
                type="number"
                step="0.01"
                min="0"
                value={form.rs_price}
                onChange={handleChange}
                placeholder="Optional"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (₱)</label>
              <input
                name="price"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                name="qty"
                type="number"
                min="0"
                value={form.qty}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Threshold</label>
              <input
                name="low_stock"
                type="number"
                min="0"
                value={form.low_stock}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
              <input
                name="remarks"
                value={form.remarks}
                onChange={handleChange}
                placeholder="e.g. Super Sale ₱4,999"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : product ? 'Update' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
