import { useState, useRef, useCallback, useMemo } from 'react'
import { X, Upload, Loader2, GripVertical } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const MAX_IMAGES = 5
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

const emptyForm = { name: '', category: '', sub_category: '', rs_price: '', price: '', qty: '', low_stock: '', remarks: '', description: '' }

function getInitialImages(product) {
  if (!product) return []
  // Prefer image_urls array, fall back to legacy img
  if (product.image_urls && Array.isArray(product.image_urls) && product.image_urls.length > 0) {
    return product.image_urls.filter(Boolean).map((url) => ({ url, status: 'done' }))
  }
  if (product.img) {
    return [{ url: product.img, status: 'done' }]
  }
  return []
}

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
          remarks: product.remarks || '',
          description: product.description || '',
        }
      : { ...emptyForm }
  )
  const [saving, setSaving] = useState(false)
  const [images, setImages] = useState(() => getInitialImages(product))
  const [dragActive, setDragActive] = useState(false)
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)
  const fileRef = useRef(null)
  // Track URLs that were removed from an existing product (to delete from storage on save)
  const [removedUrls, setRemovedUrls] = useState([])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const processFiles = useCallback(async (files) => {
    const fileList = Array.from(files)
    const currentCount = images.length
    const remaining = MAX_IMAGES - currentCount

    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_IMAGES} images allowed`)
      return
    }

    const toProcess = fileList.slice(0, remaining)
    if (fileList.length > remaining) {
      toast.error(`Only ${remaining} more image${remaining === 1 ? '' : 's'} can be added (max ${MAX_IMAGES})`)
    }

    for (const file of toProcess) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: Only PNG, JPEG, and WebP allowed`)
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: Image must be under 5 MB`)
        continue
      }

      const localUrl = URL.createObjectURL(file)
      const tempId = `temp_${Date.now()}_${Math.random()}`

      // Add placeholder with local preview
      setImages((prev) => [...prev, { url: localUrl, status: 'uploading', tempId }])

      const ext = file.name.split('.').pop().toLowerCase()
      const fileName = `product_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

      const { error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, { contentType: file.type, upsert: true })

      if (error) {
        toast.error(`Upload failed: ${error.message}`)
        setImages((prev) => prev.filter((img) => img.tempId !== tempId))
        URL.revokeObjectURL(localUrl)
        continue
      }

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName)

      URL.revokeObjectURL(localUrl)
      setImages((prev) =>
        prev.map((img) =>
          img.tempId === tempId ? { url: urlData.publicUrl, status: 'done' } : img
        )
      )
    }
  }, [images.length])

  const handleImageUpload = (e) => {
    if (e.target.files?.length) processFiles(e.target.files)
    if (fileRef.current) fileRef.current.value = ''
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
    if (e.dataTransfer.files?.length) processFiles(e.dataTransfer.files)
  }

  const removeImage = async (index) => {
    const img = images[index]
    if (img.url && img.url.includes('/product-images/') && img.status === 'done') {
      setRemovedUrls((prev) => [...prev, img.url])
    }
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  // Drag reorder handlers
  const handleThumbDragStart = (e, idx) => {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleThumbDragOver = (e, idx) => {
    e.preventDefault()
    setDragOverIdx(idx)
  }

  const handleThumbDrop = (e, idx) => {
    e.preventDefault()
    e.stopPropagation()
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return }
    setImages((prev) => {
      const updated = [...prev]
      const [moved] = updated.splice(dragIdx, 1)
      updated.splice(idx, 0, moved)
      return updated
    })
    setDragIdx(null)
    setDragOverIdx(null)
  }

  const handleThumbDragEnd = () => {
    setDragIdx(null)
    setDragOverIdx(null)
  }

  const isUploading = images.some((img) => img.status === 'uploading')
  const doneImages = useMemo(() => images.filter((img) => img.status === 'done'), [images])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    // Delete removed images from storage
    if (removedUrls.length > 0) {
      const filenames = removedUrls
        .filter((u) => u.includes('/product-images/'))
        .map((u) => u.split('/product-images/').pop())
        .filter(Boolean)
      if (filenames.length > 0) {
        await supabase.storage.from('product-images').remove(filenames)
      }
    }

    const imageUrls = doneImages.map((img) => img.url)

    await onSave({
      name: form.name,
      category: form.category,
      sub_category: form.sub_category || null,
      rs_price: form.rs_price !== '' ? parseFloat(form.rs_price) : null,
      price: parseFloat(form.price) || 0,
      qty: parseInt(form.qty) || 0,
      low_stock: parseInt(form.low_stock) || 0,
      image_urls: imageUrls,
      img: imageUrls[0] || null,
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
          {/* Multi-image upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Images <span className="text-gray-400 font-normal">({images.length}/{MAX_IMAGES})</span>
            </label>

            {/* Thumbnail grid */}
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    draggable={img.status === 'done'}
                    onDragStart={(e) => handleThumbDragStart(e, idx)}
                    onDragOver={(e) => handleThumbDragOver(e, idx)}
                    onDrop={(e) => handleThumbDrop(e, idx)}
                    onDragEnd={handleThumbDragEnd}
                    className={`relative group w-20 h-20 rounded-xl border-2 transition-all ${
                      dragOverIdx === idx ? 'border-[#7C3AED] scale-105' : 'border-[#EDE9FE]'
                    } ${dragIdx === idx ? 'opacity-40' : ''}`}
                  >
                    <img
                      src={img.url}
                      alt={`Image ${idx + 1}`}
                      className={`w-full h-full rounded-xl object-cover ${img.status === 'uploading' ? 'opacity-50' : ''}`}
                    />
                    {img.status === 'uploading' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 size={20} className="animate-spin text-[#7C3AED]" />
                      </div>
                    )}
                    {img.status === 'done' && (
                      <>
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors opacity-0 group-hover:opacity-100"
                          title="Remove image"
                        >
                          <X size={12} />
                        </button>
                        <div className="absolute top-0.5 left-0.5 opacity-0 group-hover:opacity-70 cursor-grab active:cursor-grabbing transition-opacity">
                          <GripVertical size={14} className="text-white drop-shadow-lg" />
                        </div>
                      </>
                    )}
                    {idx === 0 && img.status === 'done' && (
                      <span className="absolute bottom-0.5 left-0.5 bg-[#7C3AED] text-white text-[8px] font-bold px-1 rounded">
                        COVER
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Dropzone */}
            {images.length < MAX_IMAGES && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-2 py-6 px-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  dragActive
                    ? 'border-[#7C3AED] bg-[#F5F3FF]'
                    : 'border-[#C4B5FD] hover:border-[#7C3AED] hover:bg-[#F5F3FF]'
                }`}
              >
                <Upload size={24} className="text-[#7C3AED]" />
                <p className="text-sm text-gray-600 text-center">
                  <span className="font-medium text-[#7C3AED]">Drag & drop</span> up to {MAX_IMAGES} images, or{' '}
                  <span className="font-medium text-[#7C3AED]">click to browse</span>
                </p>
                <p className="text-xs text-gray-400">PNG, JPEG, or WebP — max 5 MB each</p>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
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
              disabled={saving || isUploading}
              className="px-4 py-2 text-sm font-medium text-white bg-[#7C3AED] rounded-lg hover:bg-[#6D28D9] transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : isUploading ? 'Uploading...' : product ? 'Update' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
