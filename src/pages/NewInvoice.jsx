import { useState, useEffect, useMemo } from 'react'
import { Plus, X, Search, Trash2, Save, Loader2, ArrowLeft, Percent, Package } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

function formatCurrency(amount) {
  return `₱${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function isHttpUrl(str) {
  return typeof str === 'string' && str.startsWith('http')
}

function extractInvoiceParts(invoiceNumber) {
  const m = String(invoiceNumber || '').match(/^([A-Za-z]+)-(\d{4})-(\d{4})$/)
  if (!m) return null
  return { prefix: m[1], year: Number(m[2]), seq: Number(m[3]) }
}

async function generateNextInvoiceNumber() {
  const now = new Date()
  const year = now.getFullYear()

  const { data, error } = await supabase
    .from('invoices')
    .select('invoice_number')
    .not('invoice_number', 'is', null)

  if (error) throw error

  let maxSeq = 0

  for (const row of data || []) {
    const parts = extractInvoiceParts(row.invoice_number)
    if (!parts) continue
    if (parts.year === year) {
      if (parts.seq > maxSeq) maxSeq = parts.seq
    }
  }

  return `FFZ-${year}-${String(maxSeq + 1).padStart(4, '0')}`
}

function ProductThumb({ img, name }) {
  if (isHttpUrl(img)) {
    return <img src={img} alt={name} className="w-10 h-10 rounded-lg object-cover" />
  }
  if (img && img.trim()) {
    return <div className="w-10 h-10 rounded-lg bg-[#EDE9FE] flex items-center justify-center text-xl">{img}</div>
  }
  return (
    <div className="w-10 h-10 rounded-lg bg-[#EDE9FE] flex items-center justify-center">
      <Package size={18} className="text-[#7C3AED]" />
    </div>
  )
}

// ─── Product Picker Modal ────────────────────────────────────────────
function ProductPicker({ products, onSelect, onClose, alreadyAdded }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return products.filter(
      (p) =>
        !alreadyAdded.has(p.id) &&
        (p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q)))
    )
  }, [products, search, alreadyAdded])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDE9FE]">
          <h3 className="font-semibold text-[#7C3AED] text-lg">Add Product</h3>
          <button onClick={onClose} className="p-1 hover:bg-[#EDE9FE] rounded-lg transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>
        <div className="px-5 py-3 border-b border-[#EDE9FE]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7C3AED]" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-4 py-2 text-sm border-2 border-[#EDE9FE] rounded-xl focus:ring-4 focus:ring-[#EDE9FE] focus:border-[#7C3AED] outline-none transition-all"
            />
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search size={28} className="text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No matching products found</p>
            </div>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelect(p)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#F5F3FF] transition-colors text-left"
              >
                <ProductThumb img={p.img} name={p.name} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.category || 'Uncategorized'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-[#7C3AED]">{formatCurrency(p.price)}</p>
                  <p className="text-xs text-gray-400">{p.qty} in stock</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────
export default function NewInvoice() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [lineItems, setLineItems] = useState([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Customer & invoice fields
  const [customerName, setCustomerName] = useState('')
  const [customerContact, setCustomerContact] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [shippingOption, setShippingOption] = useState('')
  const [shippingFeeValue, setShippingFeeValue] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('Unpaid')
  const [amountPaid, setAmountPaid] = useState('')
  const [isPreorder, setIsPreorder] = useState(false)
  const [expectedArrivalDate, setExpectedArrivalDate] = useState('')
  const [fulfillmentStatus, setFulfillmentStatus] = useState('Pending')
  const [isLayaway, setIsLayaway] = useState(false)
  const [layawayDepositAmount, setLayawayDepositAmount] = useState('')
  const [layawayDueDate, setLayawayDueDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 60)
    return d.toISOString().slice(0, 10)
  })
  const [layawayStatus, setLayawayStatus] = useState('Active')
  const [discountValue, setDiscountValue] = useState('')
  const [discountType, setDiscountType] = useState('amount')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .gt('qty', 0)
        .order('name')
      if (data) setProducts(data)
    }
    load()
  }, [])

  const alreadyAdded = useMemo(() => new Set(lineItems.map((li) => li.product_id)), [lineItems])

  function addProduct(product) {
    setLineItems((prev) => [
      ...prev,
      {
        product_id: product.id,
        product_name: product.name,
        product_category: product.category || '',
        unit_price: product.price,
        qty: 1,
        max_qty: product.qty,
        img: product.img,
      },
    ])
    setPickerOpen(false)
  }

  function updateLineItem(index, field, value) {
    setLineItems((prev) =>
      prev.map((li, i) => {
        if (i !== index) return li
        const updated = { ...li, [field]: value }
        if (field === 'qty') {
          const n = Math.max(1, Math.min(Number(value) || 1, li.max_qty))
          updated.qty = n
        }
        if (field === 'unit_price') {
          updated.unit_price = Math.max(0, Number(value) || 0)
        }
        return updated
      })
    )
  }

  function removeLineItem(index) {
    setLineItems((prev) => prev.filter((_, i) => i !== index))
  }

  const subtotal = lineItems.reduce((sum, li) => sum + li.unit_price * li.qty, 0)

  const discountAmount = useMemo(() => {
    const v = Number(discountValue) || 0
    if (v <= 0) return 0
    if (discountType === 'percent') return Math.min(subtotal, subtotal * (v / 100))
    return Math.min(subtotal, v)
  }, [discountValue, discountType, subtotal])

  const shippingFee = Math.max(0, Number(shippingFeeValue) || 0)
  const total = Math.max(0, subtotal - discountAmount + shippingFee)
  const paidNum = Number(amountPaid) || 0
  const balanceDue = Math.max(0, total - paidNum)

  // Auto-calc layaway deposit default (30% of total)
  const layawayDepositDefault = Math.round(total * 0.3 * 100) / 100

  // Validation
  function validate() {
    if (lineItems.length === 0) {
      toast.error('Add at least one product')
      return false
    }
    if (isLayaway) {
      const deposit = Number(layawayDepositAmount) || layawayDepositDefault
      if (paidNum < deposit) {
        toast.error(`Amount Paid must be at least the deposit (${formatCurrency(deposit)})`)
        return false
      }
      return true
    }
    if (paymentStatus === 'Paid' && paidNum !== total) {
      toast.error('Amount Paid must equal Total when status is "Paid"')
      return false
    }
    if (paymentStatus === 'Partially Paid' && (paidNum <= 0 || paidNum >= total)) {
      toast.error('Amount Paid must be > 0 and < Total for "Partially Paid"')
      return false
    }
    return true
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)

    try {
      // For layaway, auto-calculate payment status
      let finalPaymentStatus = paymentStatus
      if (isLayaway) {
        if (paidNum >= total) finalPaymentStatus = 'Paid'
        else if (paidNum > 0) finalPaymentStatus = 'Partially Paid'
        else finalPaymentStatus = 'Unpaid'
      }
      const invoiceNumber = await generateNextInvoiceNumber()

      const invoiceRow = {
        invoice_number: invoiceNumber,
        customer_name: customerName.trim() || null,
        customer_contact: customerContact.trim() || null,
        subtotal,
        discount: discountAmount,
        total,
        payment_method: paymentMethod || null,
        shipping_option: shippingOption || null,
        payment_status: finalPaymentStatus,
        amount_paid: paidNum,
        is_preorder: isPreorder && !isLayaway,
        expected_arrival_date: isPreorder && !isLayaway && expectedArrivalDate ? expectedArrivalDate : null,
        fulfillment_status: isPreorder && !isLayaway ? fulfillmentStatus : null,
        is_layaway: isLayaway,
        layaway_deposit_amount: isLayaway ? (Number(layawayDepositAmount) || layawayDepositDefault) : null,
        layaway_due_date: isLayaway ? layawayDueDate : null,
        layaway_status: isLayaway ? layawayStatus : null,
        status: 'active',
        notes: notes.trim() || null,
        created_by: user?.email || null,
      }

      let { data: invoice, error: invErr } = await supabase
        .from('invoices')
        .insert([invoiceRow])
        .select()
        .single()

      // Handle rare race where two users generate the same invoice number at once.
      if (invErr?.code === '23505') {
        const retryInvoiceNumber = await generateNextInvoiceNumber()
        ;({ data: invoice, error: invErr } = await supabase
          .from('invoices')
          .insert([{ ...invoiceRow, invoice_number: retryInvoiceNumber }])
          .select()
          .single())
      }

      if (invErr || !invoice) {
        toast.error(`Failed to create invoice: ${invErr?.message || 'Unknown error'}`)
        console.error(invErr)
        return
      }

      const items = lineItems.map((li) => ({
        invoice_id: invoice.id,
        product_id: li.product_id,
        product_name: li.product_name,
        product_category: li.product_category,
        qty: li.qty,
        unit_price: li.unit_price,
        line_total: li.unit_price * li.qty,
      }))

      const { error: itemsErr } = await supabase.from('invoice_items').insert(items)

      if (itemsErr) {
        await supabase.from('invoices').delete().eq('id', invoice.id)
        toast.error('Failed to save line items — invoice rolled back')
        console.error(itemsErr)
        return
      }

      // Reserve inventory for layaway (non-blocking — don't let this fail the invoice)
      if (isLayaway && layawayStatus === 'Active') {
        try {
          for (const li of lineItems) {
            const { data: prod } = await supabase.from('products').select('reserved_qty').eq('id', li.product_id).single()
            if (prod) {
              await supabase.from('products').update({ reserved_qty: (prod.reserved_qty || 0) + li.qty }).eq('id', li.product_id)
            }
          }
        } catch (reserveErr) {
          console.warn('Failed to update reserved_qty — reconcile manually:', reserveErr)
        }
      }

      toast.success('Invoice created!')
      window.location.hash = `/invoices/${invoice.id}`
    } catch (err) {
      console.error('Invoice save failed:', err)
      toast.error(`Failed to save: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full px-3 py-2 text-sm border-2 border-[#EDE9FE] rounded-xl focus:ring-4 focus:ring-[#EDE9FE] focus:border-[#7C3AED] outline-none transition-all'

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <a
            href="#/invoices"
            className="p-2 hover:bg-[#EDE9FE] rounded-lg transition-colors"
            title="Back to invoices"
          >
            <ArrowLeft size={20} className="text-[#7C3AED]" />
          </a>
          <h2 className="text-2xl font-bold text-[#7C3AED]">New Invoice</h2>
        </div>
        <a
          href="#/invoices"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
        >
          Cancel
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── LEFT: Line Items (2 cols) ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Line Items</h3>
            <button
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center gap-1.5 bg-[#7C3AED] text-white px-4 py-2 rounded-lg hover:bg-[#6D28D9] transition-colors font-semibold text-sm shadow-sm"
            >
              <Plus size={16} />
              Add Product
            </button>
          </div>

          {lineItems.length === 0 ? (
            <div className="bg-[#F5F3FF] border-2 border-dashed border-[#C4B5FD] rounded-xl p-10 text-center">
              <Package size={32} className="mx-auto text-[#7C3AED] mb-3" />
              <p className="text-sm text-[#6D28D9] font-medium">No products added yet</p>
              <p className="text-xs text-gray-500 mt-1">Click "Add Product" to get started</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-[#EDE9FE] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F5F3FF] border-b border-[#EDE9FE]">
                      <th className="text-left px-4 py-3 font-semibold text-[#7C3AED]">Product</th>
                      <th className="text-right px-4 py-3 font-semibold text-[#7C3AED] w-28">Unit Price</th>
                      <th className="text-center px-4 py-3 font-semibold text-[#7C3AED] w-24">Qty</th>
                      <th className="text-right px-4 py-3 font-semibold text-[#7C3AED] w-28">Line Total</th>
                      <th className="w-12" />
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((li, idx) => (
                      <tr key={li.product_id} className="border-b border-[#EDE9FE]/60">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <ProductThumb img={li.img} name={li.product_name} />
                            <div className="min-w-0">
                              <p className="font-medium text-gray-800 truncate">{li.product_name}</p>
                              <p className="text-xs text-gray-400">{li.max_qty} in stock</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={li.unit_price}
                            onChange={(e) => updateLineItem(idx, 'unit_price', e.target.value)}
                            className="w-full text-right px-2 py-1.5 text-sm border border-[#EDE9FE] rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-[#7C3AED] outline-none"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => updateLineItem(idx, 'qty', li.qty - 1)}
                              disabled={li.qty <= 1}
                              className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#EDE9FE] hover:bg-[#EDE9FE] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[#7C3AED] font-bold"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={li.max_qty}
                              value={li.qty}
                              onChange={(e) => updateLineItem(idx, 'qty', e.target.value)}
                              className="w-12 text-center px-1 py-1.5 text-sm border border-[#EDE9FE] rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-[#7C3AED] outline-none"
                            />
                            <button
                              onClick={() => {
                                if (li.qty >= li.max_qty) {
                                  toast.error(`Only ${li.max_qty} in stock`)
                                  return
                                }
                                updateLineItem(idx, 'qty', li.qty + 1)
                              }}
                              disabled={li.qty >= li.max_qty}
                              className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#EDE9FE] hover:bg-[#EDE9FE] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[#7C3AED] font-bold"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">
                          {formatCurrency(li.unit_price * li.qty)}
                        </td>
                        <td className="px-2 py-3">
                          <button
                            onClick={() => removeLineItem(idx)}
                            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors group"
                            title="Remove"
                          >
                            <Trash2 size={16} className="text-gray-300 group-hover:text-red-500" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Summary (sticky) ── */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-24 space-y-5">
            {/* Customer info */}
            <div className="bg-white rounded-xl shadow-sm border border-[#EDE9FE] p-5 space-y-4">
              <h3 className="font-semibold text-gray-800">Customer Info</h3>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Customer Name</label>
                <input type="text" placeholder="Optional" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Contact (phone / email)</label>
                <input type="text" placeholder="Optional" value={customerContact} onChange={(e) => setCustomerContact(e.target.value)} className={inputClass} />
              </div>
            </div>

            {/* Payment & discount */}
            <div className="bg-white rounded-xl shadow-sm border border-[#EDE9FE] p-5 space-y-4">
              <h3 className="font-semibold text-gray-800">Payment</h3>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Payment Method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={inputClass}>
                  <option value="">Select...</option>
                  <option value="Cash">Cash</option>
                  <option value="GCash">GCash</option>
                  <option value="Maya">Maya</option>
                  <option value="BPI">BPI</option>
                  <option value="BDO">BDO</option>
                  <option value="PayPal (CC Payment)">PayPal (CC Payment)</option>
                  <option value="GoTyme">GoTyme</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Shipping Option</label>
                <select value={shippingOption} onChange={(e) => setShippingOption(e.target.value)} className={inputClass}>
                  <option value="">Select...</option>
                  <option value="J&T">J&T</option>
                  <option value="Lalamove">Lalamove</option>
                  <option value="LBC">LBC</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Shipping Fee (₱)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Optional"
                  value={shippingFeeValue}
                  onChange={(e) => setShippingFeeValue(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Payment Status</label>
                <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className={inputClass}>
                  <option value="Unpaid">Unpaid</option>
                  <option value="Partially Paid">Partially Paid</option>
                  <option value="Paid">Paid</option>
                  <option value="Refunded">Refunded</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Amount Paid (₱)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className={inputClass}
                />
                {total > 0 && (
                  <p className="text-xs mt-1 font-medium text-gray-500">
                    Balance Due: <span className={balanceDue > 0 ? 'text-red-500' : 'text-green-600'}>{formatCurrency(balanceDue)}</span>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Discount</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className={`${inputClass} flex-1`}
                  />
                  <button
                    onClick={() => setDiscountType((t) => (t === 'amount' ? 'percent' : 'amount'))}
                    className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl border-2 border-[#EDE9FE] hover:bg-[#F5F3FF] transition-colors"
                    title={discountType === 'amount' ? 'Switch to percent' : 'Switch to peso amount'}
                  >
                    {discountType === 'percent' ? (
                      <Percent size={16} className="text-[#7C3AED]" />
                    ) : (
                      <span className="text-sm font-bold text-[#7C3AED]">₱</span>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                <textarea
                  placeholder="Optional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className={inputClass + ' resize-none'}
                />
              </div>
            </div>

            {/* Pre-order / Layaway section */}
            <div className="bg-white rounded-xl shadow-sm border border-[#EDE9FE] p-5 space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPreorder}
                  onChange={(e) => { setIsPreorder(e.target.checked); if (e.target.checked) setIsLayaway(false) }}
                  disabled={isLayaway}
                  className="w-4 h-4 rounded border-gray-300 text-[#7C3AED] focus:ring-[#7C3AED] disabled:opacity-50"
                />
                <span className={`text-sm font-semibold ${isLayaway ? 'text-gray-400' : 'text-gray-800'}`}>This is a Pre-order</span>
              </label>
              {isPreorder && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Expected Arrival Date</label>
                    <input
                      type="date"
                      value={expectedArrivalDate}
                      onChange={(e) => setExpectedArrivalDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Fulfillment Status</label>
                    <select value={fulfillmentStatus} onChange={(e) => setFulfillmentStatus(e.target.value)} className={inputClass}>
                      <option value="Pending">Pending</option>
                      <option value="Ready">Ready</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </>
              )}

              <div className="border-t border-[#EDE9FE] pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isLayaway}
                    onChange={(e) => { setIsLayaway(e.target.checked); if (e.target.checked) setIsPreorder(false) }}
                    disabled={isPreorder}
                    className="w-4 h-4 rounded border-gray-300 text-[#7C3AED] focus:ring-[#7C3AED] disabled:opacity-50"
                  />
                  <span className={`text-sm font-semibold ${isPreorder ? 'text-gray-400' : 'text-gray-800'}`}>This is a Layaway</span>
                </label>
                {isLayaway && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Minimum Deposit (₱)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={layawayDepositDefault.toFixed(2)}
                        value={layawayDepositAmount}
                        onChange={(e) => setLayawayDepositAmount(e.target.value)}
                        className={inputClass}
                      />
                      <p className="text-[10px] text-gray-400 mt-0.5">Default: 30% of total ({formatCurrency(layawayDepositDefault)})</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Due Date</label>
                      <input
                        type="date"
                        value={layawayDueDate}
                        onChange={(e) => setLayawayDueDate(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Layaway Status</label>
                      <select value={layawayStatus} onChange={(e) => setLayawayStatus(e.target.value)} className={inputClass}>
                        <option value="Active">Active</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                        <option value="Defaulted">Defaulted</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Summary card */}
            <div className="bg-[#F5F3FF] rounded-xl border border-[#EDE9FE] p-5 space-y-3">
              <h3 className="font-semibold text-[#7C3AED]">Summary</h3>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-800">{formatCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Discount{discountType === 'percent' && discountValue ? ` (${discountValue}%)` : ''}
                  </span>
                  <span className="font-medium text-red-500">-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              {shippingFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping Fee</span>
                  <span className="font-medium text-gray-800">{formatCurrency(shippingFee)}</span>
                </div>
              )}
              <div className="border-t border-[#DDD6FE] pt-3 flex justify-between">
                <span className="font-semibold text-[#7C3AED]">Total</span>
                <span className="text-xl font-bold text-[#7C3AED]">{formatCurrency(total)}</span>
              </div>
              {paidNum > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Amount Paid</span>
                    <span className="font-medium text-green-600">{formatCurrency(paidNum)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Balance Due</span>
                    <span className={`font-medium ${balanceDue > 0 ? 'text-red-500' : 'text-green-600'}`}>{formatCurrency(balanceDue)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={lineItems.length === 0 || saving}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#7C3AED] text-white px-5 py-3 rounded-xl hover:bg-[#6D28D9] transition-colors font-semibold text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Invoice
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {pickerOpen && (
        <ProductPicker
          products={products}
          alreadyAdded={alreadyAdded}
          onSelect={addProduct}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </main>
  )
}
