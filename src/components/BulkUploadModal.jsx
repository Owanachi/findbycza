import { useState, useRef, useMemo, useCallback } from 'react'
import { X, Upload, Loader2, Trash2, Package } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const MAX_FILES = 50
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const ADD_NEW = '__add_new__'

function titleCase(str) {
  if (!str) return ''
  return str.trim().replace(/\s+/g, ' ').replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

function filenameToName(filename) {
  // Remove extension, convert separators to spaces, apply title case
  const base = filename.replace(/\.[^.]+$/, '')
  return titleCase(base.replace(/[_\-]+/g, ' '))
}

export default function BulkUploadModal({ allProducts, userEmail, onClose, onDone }) {
  const [category, setCategory] = useState('')
  const [subCategory, setSubCategory] = useState('')
  const [addingNewCategory, setAddingNewCategory] = useState(false)
  const [newCategoryValue, setNewCategoryValue] = useState('')
  const [addingNewSubCategory, setAddingNewSubCategory] = useState(false)
  const [newSubCategoryValue, setNewSubCategoryValue] = useState('')
  const [rows, setRows] = useState([]) // { file, name, qty, localUrl }
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [dragActive, setDragActive] = useState(false)
  const fileRef = useRef(null)

  const categories = useMemo(() => {
    return [...new Set(allProducts.map((p) => p.category).filter(Boolean))].sort()
  }, [allProducts])

  const subCategories = useMemo(() => {
    if (!category) return []
    return [...new Set(
      allProducts
        .filter((p) => p.category === category)
        .map((p) => p.sub_category)
        .filter(Boolean)
    )].sort()
  }, [allProducts, category])

  const handleCategorySelect = (value) => {
    if (value === ADD_NEW) { setAddingNewCategory(true); setNewCategoryValue(''); return }
    setCategory(value)
    setSubCategory('')
    setAddingNewCategory(false)
    setAddingNewSubCategory(false)
  }

  const confirmNewCategory = () => {
    const normalized = titleCase(newCategoryValue)
    if (!normalized) { toast.error('Category name is required'); return }
    setCategory(normalized)
    setSubCategory('')
    setAddingNewCategory(false)
    setAddingNewSubCategory(false)
  }

  const handleSubCategorySelect = (value) => {
    if (value === ADD_NEW) { setAddingNewSubCategory(true); setNewSubCategoryValue(''); return }
    setSubCategory(value)
    setAddingNewSubCategory(false)
  }

  const confirmNewSubCategory = () => {
    const normalized = titleCase(newSubCategoryValue)
    if (!normalized) { toast.error('Sub-category name is required'); return }
    setSubCategory(normalized)
    setAddingNewSubCategory(false)
  }

  const addFiles = useCallback((files) => {
    const fileList = Array.from(files)
    const remaining = MAX_FILES - rows.length

    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_FILES} images per bulk upload`)
      return
    }

    const toAdd = fileList.slice(0, remaining)
    if (fileList.length > remaining) {
      toast.error(`Only ${remaining} more image${remaining === 1 ? '' : 's'} can be added (max ${MAX_FILES})`)
    }

    const newRows = []
    for (const file of toAdd) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: Only PNG, JPEG, and WebP allowed`)
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: Image must be under 5 MB`)
        continue
      }
      newRows.push({
        file,
        name: filenameToName(file.name),
        qty: 1,
        localUrl: URL.createObjectURL(file),
      })
    }

    if (newRows.length > 0) {
      setRows((prev) => [...prev, ...newRows])
    }
  }, [rows.length])

  const removeRow = (index) => {
    const row = rows[index]
    if (row.localUrl) URL.revokeObjectURL(row.localUrl)
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  const updateRow = (index, field, value) => {
    setRows((prev) => prev.map((r, i) => {
      if (i !== index) return r
      if (field === 'qty') return { ...r, qty: Math.max(0, parseInt(value) || 0) }
      return { ...r, [field]: value }
    }))
  }

  const handleFileInput = (e) => {
    if (e.target.files?.length) addFiles(e.target.files)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (!category) { toast.error('Category is required'); return }
    if (rows.length === 0) { toast.error('Add at least one image'); return }

    setUploading(true)
    const total = rows.length
    let created = 0
    let skipped = 0
    setProgress({ done: 0, total })

    const normalizedCategory = titleCase(category)
    const normalizedSubCategory = subCategory ? titleCase(subCategory) : null

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      setProgress({ done: i, total })

      const productName = titleCase(row.name.trim())
      if (!productName) { skipped++; continue }

      // Check for duplicate
      const nameKey = productName.toLowerCase()
      const catKey = normalizedCategory.toLowerCase()
      let dupQuery = supabase.from('products').select('id').ilike('name', nameKey).ilike('category', catKey)
      if (normalizedSubCategory) {
        dupQuery = dupQuery.ilike('sub_category', normalizedSubCategory)
      } else {
        dupQuery = dupQuery.or('sub_category.is.null,sub_category.eq.')
      }
      const { data: dups } = await dupQuery
      if (dups && dups.length > 0) { skipped++; continue }

      // Upload image
      const ext = row.file.name.split('.').pop().toLowerCase()
      const fileName = `product_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('product-images')
        .upload(fileName, row.file, { contentType: row.file.type, upsert: true })

      if (uploadErr) {
        toast.error(`Upload failed for ${row.name}: ${uploadErr.message}`)
        skipped++
        continue
      }

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName)

      const uploadedUrl = urlData.publicUrl

      // Insert product
      const { error: insertErr } = await supabase.from('products').insert([{
        name: productName,
        category: normalizedCategory,
        sub_category: normalizedSubCategory,
        qty: row.qty,
        low_stock: 0,
        rs_price: 0,
        price: 0,
        status: 'active',
        img: uploadedUrl,
        image_urls: [uploadedUrl],
        description: null,
        updated_by: userEmail || null,
      }])

      if (insertErr) {
        if (insertErr.code === '23505') { skipped++ }
        else { toast.error(`Failed to create ${productName}`); skipped++ }
        continue
      }

      created++
    }

    setProgress({ done: total, total })

    // Clean up local URLs
    for (const row of rows) {
      if (row.localUrl) URL.revokeObjectURL(row.localUrl)
    }

    if (created > 0 && skipped > 0) {
      toast.success(`${created} product${created === 1 ? '' : 's'} created, ${skipped} skipped (duplicate names)`)
    } else if (created > 0) {
      toast.success(`${created} product${created === 1 ? '' : 's'} created. Edit each one to add pricing details.`)
    } else {
      toast.error('No products created — all were duplicates or failed')
    }

    setUploading(false)
    onDone()
    onClose()
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-[#7C3AED] outline-none text-sm'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #9F67F7)' }}
        >
          <div className="flex items-center gap-2">
            <Package size={20} className="text-white" />
            <h2 className="text-lg font-bold text-white">Bulk Upload Products</h2>
          </div>
          <button onClick={onClose} disabled={uploading} className="text-white/80 hover:text-white transition-colors disabled:opacity-50">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Category & Sub-Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
              {addingNewCategory ? (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={newCategoryValue}
                    onChange={(e) => setNewCategoryValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmNewCategory() } }}
                    placeholder="Type new category name"
                    autoFocus
                    className={`${inputClass} border-[#7C3AED]`}
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={confirmNewCategory} className="text-xs font-semibold text-[#7C3AED]">Save</button>
                    <button type="button" onClick={() => setAddingNewCategory(false)} className="text-xs text-gray-400">Cancel</button>
                  </div>
                </div>
              ) : (
                <select value={category} onChange={(e) => handleCategorySelect(e.target.value)} className={inputClass} disabled={uploading}>
                  <option value="">Select category...</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  {category && !categories.includes(category) && <option value={category}>{category}</option>}
                  <option disabled>────────────</option>
                  <option value={ADD_NEW}>+ Add new category...</option>
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sub-Category</label>
              {addingNewSubCategory ? (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={newSubCategoryValue}
                    onChange={(e) => setNewSubCategoryValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmNewSubCategory() } }}
                    placeholder="Type new sub-category name"
                    autoFocus
                    className={`${inputClass} border-[#7C3AED]`}
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={confirmNewSubCategory} className="text-xs font-semibold text-[#7C3AED]">Save</button>
                    <button type="button" onClick={() => setAddingNewSubCategory(false)} className="text-xs text-gray-400">Cancel</button>
                  </div>
                </div>
              ) : (
                <select value={subCategory} onChange={(e) => handleSubCategorySelect(e.target.value)} disabled={!category || uploading} className={`${inputClass} disabled:opacity-50`}>
                  <option value="">None (optional)</option>
                  {subCategories.map((s) => <option key={s} value={s}>{s}</option>)}
                  {subCategory && !subCategories.includes(subCategory) && <option value={subCategory}>{subCategory}</option>}
                  <option disabled>────────────</option>
                  <option value={ADD_NEW}>+ Add new sub-category...</option>
                </select>
              )}
            </div>
          </div>

          {/* Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true) }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false) }}
            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files) }}
            onClick={() => !uploading && fileRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-2 py-8 px-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
              uploading ? 'opacity-50 cursor-not-allowed' :
              dragActive ? 'border-[#7C3AED] bg-[#F5F3FF]' : 'border-[#C4B5FD] hover:border-[#7C3AED] hover:bg-[#F5F3FF]'
            }`}
          >
            <Upload size={28} className="text-[#7C3AED]" />
            <p className="text-sm text-gray-600 text-center">
              <span className="font-medium text-[#7C3AED]">Drag & drop images here</span>, or{' '}
              <span className="font-medium text-[#7C3AED]">click to browse</span>
            </p>
            <p className="text-xs text-gray-400">Each image will become a separate product. Up to {MAX_FILES} images, 5 MB each.</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />

          {/* Preview list */}
          {rows.length > 0 && (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              <p className="text-xs font-medium text-gray-500">{rows.length} product{rows.length === 1 ? '' : 's'} to create</p>
              {rows.map((row, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-[#F5F3FF] rounded-xl p-2.5">
                  <img src={row.localUrl} alt={row.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => updateRow(idx, 'name', e.target.value)}
                    disabled={uploading}
                    className="flex-1 min-w-0 px-2 py-1 text-sm border border-[#EDE9FE] rounded-lg focus:ring-1 focus:ring-[#7C3AED] outline-none disabled:opacity-50"
                    placeholder="Product name"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <label className="text-[10px] text-gray-400">Qty:</label>
                    <input
                      type="number"
                      min="0"
                      value={row.qty}
                      onChange={(e) => updateRow(idx, 'qty', e.target.value)}
                      disabled={uploading}
                      className="w-14 px-2 py-1 text-sm text-center border border-[#EDE9FE] rounded-lg focus:ring-1 focus:ring-[#7C3AED] outline-none disabled:opacity-50"
                    />
                  </div>
                  <button
                    onClick={() => removeRow(idx)}
                    disabled={uploading}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Remove"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload progress */}
          {uploading && (
            <div className="flex items-center gap-3 bg-purple-50 rounded-xl px-4 py-3">
              <Loader2 size={18} className="animate-spin text-[#7C3AED]" />
              <span className="text-sm text-[#7C3AED] font-medium">
                Uploading {progress.done + 1} of {progress.total}...
              </span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <button
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={uploading || rows.length === 0 || !category}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-[#7C3AED] rounded-lg hover:bg-[#6D28D9] transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <><Loader2 size={16} className="animate-spin" /> Uploading...</>
              ) : (
                <><Upload size={16} /> Upload & Create {rows.length} Product{rows.length === 1 ? '' : 's'}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
