import { useState, useRef, useCallback } from 'react'
import { X, Upload, ImageIcon, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

const emptyForm = { name: '', category: '', sub_category: '', rs_price: '', price: '', qty: '', low_stock: '', img: '', remarks: '', description: '' }

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
          description: product.description || '',
        }
      : { ...emptyForm }
  )
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(product?.img || null)
  const [dragActive, setDragActive] = useState(false)
  const fileRef = useRef(null)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const processFile = useCallback(async (file) => {
    if (!file) return

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Only PNG, JPEG, and WebP images are allowed')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('Image must be under 5 MB')
      return
    }

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
  }, [form.img])

  const handleImageUpload = (e) => {
    processFile(e.target.files?.[0])
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  const removeImage = () => {
    setPreview(null)
    setForm((f) => ({ ...f, img: '' }))
    if (fileRef.current) fileRef.current.value = ''
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
      description: form.description.trim() || null,
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #9F67F7)' }}
        >
          <h2 className="text-lg font-bold text-white">
            {product ? 'Edit Product' : 'Add Product'}
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Drag & drop image upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
            {preview ? (
              <div className="relative inline-block">
                <img
                  src={preview}
                  alt="Preview"
                  className={`w-32 h-32 rounded-xl object-cover border-2 border-[#EDE9FE] ${uploading ? 'opacity-50' : ''}`}
                />
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 size={28} className="animate-spin text-[#7C3AED]" />
                  </div>
                )}
                {!uploading && (
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
                    title="Remove image"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-2 py-8 px-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  dragActive
                    ? 'border-[#7C3AED] bg-[#F5F3FF]'
                    : 'border-[#C4B5FD] hover:border-[#7C3AED] hover:bg-[#F5F3FF]'
                }`}
              >
                <Upload size={28} className="text-[#7C3AED]" />
                <p className="text-sm text-gray-600 text-center">
                  <span className="font-medium text-[#7C3AED]">Drag & drop</span> image here, or{' '}
                  <span className="font-medium text-[#7C3AED]">click to browse</span>
                </p>
                <p className="text-xs text-gray-400">PNG, JPEG, or WebP — max 5 MB</p>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-[#7C3AED] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                name="category"
                value={form.category}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-[#7C3AED] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sub-Category</label>
              <input
                name="sub_category"
                value={form.sub_category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-[#7C3AED] outline-none"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-[#7C3AED] outline-none text-base"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-[#7C3AED] outline-none text-base"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-[#7C3AED] outline-none"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-[#7C3AED] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
              <input
                name="remarks"
                value={form.remarks}
                onChange={handleChange}
                placeholder="e.g. Super Sale ₱4,999"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-[#7C3AED] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={5}
              placeholder="Enter product details, features, materials, notes, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-[#7C3AED] outline-none resize-y"
            />
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
              className="px-4 py-2 text-sm font-medium text-white bg-[#7C3AED] rounded-lg hover:bg-[#6D28D9] transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : product ? 'Update' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
