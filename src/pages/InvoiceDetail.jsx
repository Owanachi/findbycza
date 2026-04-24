import { useState, useEffect, useCallback, useMemo } from 'react'
import { ArrowLeft, Printer, XCircle, AlertTriangle, Loader2, Search, Package, Truck, CheckCircle2, X, Edit3, Plus, Trash2, Save, DollarSign, Percent, Tag } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { formatAuditUser } from '../lib/userDisplay'

const LOGO_URL = 'https://iixivpuyrxeoapsouszx.supabase.co/storage/v1/object/public/product-images/Logo.jpg'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true
  })
}

function formatDateShort(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric' })
}

function formatCurrency(amount) {
  return `₱${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const paymentStatusStyles = {
  Unpaid: { bg: 'bg-red-100 text-red-700', stamp: 'text-red-500/20' },
  'Partially Paid': { bg: 'bg-yellow-100 text-yellow-700', stamp: 'text-yellow-500/20' },
  Paid: { bg: 'bg-green-100 text-green-700', stamp: 'text-green-500/20' },
  Refunded: { bg: 'bg-gray-100 text-gray-600', stamp: 'text-gray-400/20' },
  Cancelled: { bg: 'bg-gray-200 text-gray-700', stamp: 'text-gray-500/20' },
}

const paymentMethods = ['Cash', 'GCash', 'Maya', 'BPI', 'BDO', 'PayPal (CC Payment)', 'GoTyme']

// ─── Void Confirmation Modal ─────────────────────────────────────────
function VoidModal({ onConfirm, onClose, voiding }) {
  const [reason, setReason] = useState('')

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 print:hidden" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-full bg-red-100">
            <AlertTriangle size={22} className="text-red-600" />
          </div>
          <h3 className="font-semibold text-gray-900 text-lg">Void this invoice?</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">Stock will be restored for all items. This cannot be undone.</p>
        <div className="mb-5">
          <label className="block text-xs font-medium text-gray-500 mb-1">Reason (optional)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Why is this invoice being voided?"
            className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-red-100 focus:border-red-400 outline-none transition-all resize-none"
          />
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} disabled={voiding} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason.trim() || null)}
            disabled={voiding}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {voiding ? <><Loader2 size={16} className="animate-spin" /> Voiding...</> : <><XCircle size={16} /> Void Invoice</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Link Product Modal (Pre-order arrival) ──────────────────────────
function LinkProductModal({ invoice, onClose, onLinked, userEmail }) {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('products').select('*').order('name')
      if (data) setProducts(data)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q))
    )
  }, [products, search])

  async function handleSelect(product) {
    const { error } = await supabase
      .from('invoices')
      .update({ fulfillment_status: 'Ready', linked_product_id: product.id, updated_by: userEmail || null })
      .eq('id', invoice.id)
    if (error) {
      toast.error('Failed to link product')
      console.error(error)
      return
    }
    toast.success(`Linked to "${product.name}" — marked as Ready`)
    onLinked()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 print:hidden" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDE9FE]">
          <h3 className="font-semibold text-[#7C3AED] text-lg">Mark as Arrived &amp; Link to Product</h3>
          <button onClick={onClose} className="p-1 hover:bg-[#EDE9FE] rounded-lg transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>
        <div className="px-5 py-3 border-b border-[#EDE9FE]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7C3AED]" />
            <input
              type="text"
              placeholder="Search existing products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-4 py-2 text-sm border-2 border-[#EDE9FE] rounded-xl focus:ring-4 focus:ring-[#EDE9FE] focus:border-[#7C3AED] outline-none transition-all"
            />
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-[#7C3AED]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search size={28} className="text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No matching products</p>
            </div>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelect(p)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#F5F3FF] transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-[#EDE9FE] flex items-center justify-center">
                  {p.img && p.img.startsWith('http') ? (
                    <img src={p.img} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <Package size={18} className="text-[#7C3AED]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.category || 'Uncategorized'}</p>
                </div>
                <p className="text-sm font-semibold text-[#7C3AED]">{p.qty} in stock</p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Record Payment Modal ───────────────────────────────────────────
function RecordPaymentModal({ invoice, onClose, onSaved, onLayawayFullyPaid, userEmail }) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('Cash')
  const [paymentDate, setPaymentDate] = useState(() => {
    const now = new Date()
    // Format for datetime-local input
    const offset = 8 * 60 // Manila UTC+8
    const manila = new Date(now.getTime() + (offset + now.getTimezoneOffset()) * 60000)
    return manila.toISOString().slice(0, 16)
  })
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSave() {
    const amt = Number(amount)
    if (!amt || amt <= 0) {
      toast.error('Amount must be greater than 0')
      return
    }
    setSaving(true)

    // Insert payment record
    const { error: payErr } = await supabase.from('invoice_payments').insert([{
      invoice_id: invoice.id,
      amount: amt,
      payment_method: method,
      payment_date: new Date(paymentDate).toISOString(),
      notes: notes.trim() || null,
      recorded_by: userEmail || null,
    }])

    if (payErr) {
      toast.error('Failed to record payment')
      console.error(payErr)
      setSaving(false)
      return
    }

    // Recalculate total paid from all payments
    const { data: payments } = await supabase
      .from('invoice_payments')
      .select('amount')
      .eq('invoice_id', invoice.id)

    const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0)
    const invoiceTotal = Number(invoice.total || 0)

    let newStatus = 'Unpaid'
    if (totalPaid >= invoiceTotal) newStatus = 'Paid'
    else if (totalPaid > 0) newStatus = 'Partially Paid'

    await supabase.from('invoices').update({
      amount_paid: totalPaid,
      payment_status: newStatus,
      updated_by: userEmail || null,
    }).eq('id', invoice.id)

    toast.success('Payment recorded')

    // If layaway is now fully paid, trigger completion prompt
    if (invoice.is_layaway && invoice.layaway_status === 'Active' && totalPaid >= invoiceTotal && onLayawayFullyPaid) {
      onClose()
      onLayawayFullyPaid()
    } else {
      onSaved()
      onClose()
    }
    setSaving(false)
  }

  const inputClass = 'w-full px-3 py-2 text-sm border-2 border-[#EDE9FE] rounded-xl focus:ring-4 focus:ring-[#EDE9FE] focus:border-[#7C3AED] outline-none transition-all'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 print:hidden" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-full bg-green-100">
            <DollarSign size={22} className="text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900 text-lg">Record Payment</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Amount (₱)</label>
            <input type="number" min="0" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Payment Method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>
              {paymentMethods.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Payment Date</label>
            <input type="datetime-local" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes (optional)</label>
            <input type="text" placeholder="e.g. Deposit, Final payment" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><DollarSign size={16} /> Record Payment</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Invoice Modal ─────────────────────────────────────────────
function EditInvoiceModal({ invoice, onClose, onSaved, userEmail }) {
  const [customerName, setCustomerName] = useState(invoice.customer_name || '')
  const [customerContact, setCustomerContact] = useState(invoice.customer_contact || '')
  const [paymentMethod, setPaymentMethod] = useState(invoice.payment_method || '')
  const [shippingOption, setShippingOption] = useState(invoice.shipping_option || '')
  const [shippingFeeValue, setShippingFeeValue] = useState(() => {
    const explicitFee = Number(invoice.shipping_fee)
    if (Number.isFinite(explicitFee) && explicitFee > 0) return String(explicitFee)

    const itemsSubtotal = (invoice.invoice_items || []).reduce((sum, it) => sum + (Number(it.unit_price) || 0) * (Number(it.qty) || 0), 0)
    const discount = Math.max(0, Number(invoice.discount) || 0)
    const inferredFee = Math.max(0, (Number(invoice.total) || 0) - Math.max(0, itemsSubtotal - discount))
    return inferredFee > 0 ? String(Math.round(inferredFee * 100) / 100) : ''
  })
  const [paymentStatus, setPaymentStatus] = useState(invoice.payment_status || 'Unpaid')
  const [amountPaid, setAmountPaid] = useState(String(invoice.amount_paid || ''))
  const [discountValue, setDiscountValue] = useState(String(invoice.discount || ''))
  const [notes, setNotes] = useState(invoice.notes || '')
  const [isPreorder, setIsPreorder] = useState(invoice.is_preorder || false)
  const [expectedArrivalDate, setExpectedArrivalDate] = useState(invoice.expected_arrival_date || '')
  const [fulfillmentStatus, setFulfillmentStatus] = useState(invoice.fulfillment_status || 'Pending')
  const [isLayaway, setIsLayaway] = useState(invoice.is_layaway || false)
  const [layawayDepositAmount, setLayawayDepositAmount] = useState(String(invoice.layaway_deposit_amount || ''))
  const [layawayDueDate, setLayawayDueDate] = useState(invoice.layaway_due_date || '')
  const [layawayStatus, setLayawayStatus] = useState(invoice.layaway_status || 'Active')
  const [lineItems, setLineItems] = useState((invoice.invoice_items || []).map((it) => ({
    id: it.id,
    product_id: it.product_id,
    product_name: it.product_name,
    product_category: it.product_category || '',
    unit_price: it.unit_price,
    qty: it.qty,
  })))
  const [saving, setSaving] = useState(false)
  const [products, setProducts] = useState([])
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('products').select('*').eq('status', 'active').order('name')
      if (data) setProducts(data)
    }
    load()
  }, [])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape' && !pickerOpen) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, pickerOpen])

  const alreadyAdded = useMemo(() => new Set(lineItems.map((li) => li.product_id)), [lineItems])

  function addProduct(product) {
    setLineItems((prev) => [...prev, {
      id: null,
      product_id: product.id,
      product_name: product.name,
      product_category: product.category || '',
      unit_price: product.price,
      qty: 1,
    }])
    setPickerOpen(false)
  }

  function updateLineItem(index, field, value) {
    setLineItems((prev) => prev.map((li, i) => {
      if (i !== index) return li
      const updated = { ...li, [field]: value }
      if (field === 'qty') updated.qty = Math.max(1, Number(value) || 1)
      if (field === 'unit_price') updated.unit_price = Math.max(0, Number(value) || 0)
      return updated
    }))
  }

  function removeLineItem(index) {
    setLineItems((prev) => prev.filter((_, i) => i !== index))
  }

  const subtotal = lineItems.reduce((sum, li) => sum + li.unit_price * li.qty, 0)
  const discountAmount = Math.min(subtotal, Math.max(0, Number(discountValue) || 0))
  const shippingFee = Math.max(0, Number(shippingFeeValue) || 0)
  const total = Math.max(0, subtotal - discountAmount + shippingFee)
  const paidNum = Number(amountPaid) || 0

  // Auto-fill amount_paid when switching to Paid
  useEffect(() => {
    if (paymentStatus === 'Paid' && total > 0) {
      setAmountPaid(String(total))
    }
  }, [paymentStatus, total])

  function validate() {
    if (lineItems.length === 0) {
      toast.error('Add at least one product')
      return false
    }
    if (paymentStatus === 'Paid' && paidNum !== total) {
      toast.error('Amount Paid must equal Total when status is "Paid"')
      return false
    }
    if (paymentStatus === 'Partially Paid' && (paidNum <= 0 || paidNum >= total)) {
      toast.error('Amount Paid must be > 0 and < Total for "Partially Paid"')
      return false
    }
    if (paymentStatus === 'Unpaid' && paidNum !== 0) {
      toast.error('Amount Paid should be 0 for "Unpaid" status')
      return false
    }
    return true
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)

    // Build fulfillment timestamp updates
    const fulfillmentUpdates = {}
    const prevFulfillment = invoice.fulfillment_status || 'Pending'
    if (isPreorder && fulfillmentStatus !== prevFulfillment) {
      if (fulfillmentStatus === 'Shipped') {
        fulfillmentUpdates.shipped_at = new Date().toISOString()
      } else if (fulfillmentStatus === 'Delivered') {
        fulfillmentUpdates.delivered_at = new Date().toISOString()
      }
      if (fulfillmentStatus === 'Pending' || fulfillmentStatus === 'Ready') {
        fulfillmentUpdates.shipped_at = null
        fulfillmentUpdates.delivered_at = null
      }
      if (fulfillmentStatus === 'Shipped') {
        fulfillmentUpdates.delivered_at = null
      }
    }

    const invoiceUpdate = {
      customer_name: customerName.trim() || null,
      customer_contact: customerContact.trim() || null,
      subtotal,
      discount: discountAmount,
      shipping_fee: shippingFee,
      total,
      payment_method: paymentMethod || null,
      shipping_option: shippingOption || null,
      payment_status: paymentStatus,
      amount_paid: paidNum,
      is_preorder: isPreorder && !isLayaway,
      expected_arrival_date: isPreorder && !isLayaway && expectedArrivalDate ? expectedArrivalDate : null,
      fulfillment_status: isPreorder && !isLayaway ? fulfillmentStatus : null,
      is_layaway: isLayaway,
      layaway_deposit_amount: isLayaway ? (Number(layawayDepositAmount) || null) : null,
      layaway_due_date: isLayaway ? layawayDueDate || null : null,
      layaway_status: isLayaway ? layawayStatus : null,
      notes: notes.trim() || null,
      updated_by: userEmail || null,
      ...fulfillmentUpdates,
    }

    async function updateInvoiceWithFallback(payload) {
      const optionalColumns = [
        'shipping_fee',
        'expected_arrival_date',
        'fulfillment_status',
        'is_layaway',
        'layaway_deposit_amount',
        'layaway_due_date',
        'layaway_status',
      ]

      const tryUpdate = async (nextPayload) => (
        supabase.from('invoices').update(nextPayload).eq('id', invoice.id)
      )

      let result = await tryUpdate(payload)
      if (!result.error) return result

      const missingColumnError =
        result.error?.code === 'PGRST204' ||
        result.error?.code === '42703' ||
        /column/i.test(result.error?.message || '') ||
        /schema cache/i.test(result.error?.message || '')

      if (!missingColumnError) return result

      let reducedPayload = { ...payload }
      let removedAny = false

      for (const column of optionalColumns) {
        if (!(column in reducedPayload)) continue
        const nextPayload = { ...reducedPayload }
        delete nextPayload[column]
        const retry = await tryUpdate(nextPayload)
        if (!retry.error) {
          if (!removedAny) {
            toast('Saved with fallback schema compatibility', { icon: '⚠️' })
          }
          return retry
        }
        reducedPayload = nextPayload
        removedAny = true
      }

      return result
    }

    const { error: invErr } = await updateInvoiceWithFallback(invoiceUpdate)
    if (invErr) {
      toast.error('Failed to update invoice')
      console.error(invErr)
      setSaving(false)
      return
    }

    // Delete old line items and insert new ones
    await supabase.from('invoice_items').delete().eq('invoice_id', invoice.id)

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
      toast.error('Failed to update line items')
      console.error(itemsErr)
      setSaving(false)
      return
    }

    toast.success('Invoice updated successfully')
    onSaved()
    onClose()
  }

  // Wrapped handleSave with try/finally to always reset spinner
  const handleSaveWrapped = async () => {
    try {
      await handleSave()
    } catch (err) {
      console.error('Edit invoice failed:', err)
      toast.error(`Failed to save: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 text-sm border-2 border-[#EDE9FE] rounded-xl focus:ring-4 focus:ring-[#EDE9FE] focus:border-[#7C3AED] outline-none transition-all'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 print:hidden overflow-y-auto py-8" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-[#EDE9FE]">
              <Edit3 size={22} className="text-[#7C3AED]" />
            </div>
            <h3 className="font-semibold text-gray-900 text-lg">Edit Invoice</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-700 text-sm">Customer Info</h4>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Customer Name</label>
              <input type="text" placeholder="Optional" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Contact</label>
              <input type="text" placeholder="Optional" value={customerContact} onChange={(e) => setCustomerContact(e.target.value)} className={inputClass} />
            </div>

            <h4 className="font-semibold text-gray-700 text-sm pt-2">Payment</h4>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Payment Method</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={inputClass}>
                <option value="">Select...</option>
                {paymentMethods.map((m) => <option key={m} value={m}>{m}</option>)}
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
              <input type="number" min="0" step="0.01" placeholder="0.00" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Discount (₱)</label>
              <input type="number" min="0" step="0.01" placeholder="0" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
              <textarea placeholder="Optional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass + ' resize-none'} />
            </div>

            {/* Pre-order */}
            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isPreorder} onChange={(e) => { setIsPreorder(e.target.checked); if (e.target.checked) setIsLayaway(false) }} disabled={isLayaway} className="w-4 h-4 rounded border-gray-300 text-[#7C3AED] focus:ring-[#7C3AED] disabled:opacity-50" />
                <span className={`text-sm font-semibold ${isLayaway ? 'text-gray-400' : 'text-gray-800'}`}>Pre-order</span>
              </label>
              {isPreorder && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Expected Arrival Date</label>
                    <input type="date" value={expectedArrivalDate} onChange={(e) => setExpectedArrivalDate(e.target.value)} className={inputClass} />
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
                </div>
              )}
            </div>

            {/* Layaway */}
            <div className="pt-2 border-t border-gray-100">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isLayaway} onChange={(e) => { setIsLayaway(e.target.checked); if (e.target.checked) setIsPreorder(false) }} disabled={isPreorder} className="w-4 h-4 rounded border-gray-300 text-[#7C3AED] focus:ring-[#7C3AED] disabled:opacity-50" />
                <span className={`text-sm font-semibold ${isPreorder ? 'text-gray-400' : 'text-gray-800'}`}>Layaway</span>
              </label>
              {isLayaway && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Minimum Deposit (₱)</label>
                    <input type="number" min="0" step="0.01" placeholder="30% of total" value={layawayDepositAmount} onChange={(e) => setLayawayDepositAmount(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Due Date</label>
                    <input type="date" value={layawayDueDate} onChange={(e) => setLayawayDueDate(e.target.value)} className={inputClass} />
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

          {/* Right column - Line Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-700 text-sm">Line Items</h4>
              <button onClick={() => setPickerOpen(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-[#7C3AED] hover:text-[#6D28D9] transition-colors">
                <Plus size={14} /> Add Product
              </button>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {lineItems.map((li, idx) => (
                <div key={idx} className="bg-[#F5F3FF] rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-800 truncate flex-1">{li.product_name}</p>
                    <button onClick={() => removeLineItem(idx)} className="p-1 hover:bg-red-100 rounded-lg transition-colors">
                      <Trash2 size={14} className="text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-400">Price</label>
                      <input type="number" min="0" step="0.01" value={li.unit_price} onChange={(e) => updateLineItem(idx, 'unit_price', e.target.value)} className="w-full px-2 py-1 text-xs border border-[#EDE9FE] rounded-lg focus:ring-1 focus:ring-[#7C3AED] outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400">Qty</label>
                      <input type="number" min="1" value={li.qty} onChange={(e) => updateLineItem(idx, 'qty', e.target.value)} className="w-full px-2 py-1 text-xs border border-[#EDE9FE] rounded-lg focus:ring-1 focus:ring-[#7C3AED] outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400">Total</label>
                      <p className="text-xs font-semibold text-gray-700 py-1">{formatCurrency(li.unit_price * li.qty)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 mt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Discount</span>
                  <span className="font-medium text-red-500">-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              {shippingFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Shipping Fee</span>
                  <span className="font-medium">{formatCurrency(shippingFee)}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between">
                <span className="font-semibold text-[#7C3AED]">Total</span>
                <span className="font-bold text-[#7C3AED]">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSaveWrapped}
            disabled={saving || lineItems.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> Save Changes</>}
          </button>
        </div>

        {/* Product Picker within edit modal */}
        {pickerOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setPickerOpen(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDE9FE]">
                <h3 className="font-semibold text-[#7C3AED] text-lg">Add Product</h3>
                <button onClick={() => setPickerOpen(false)} className="p-1 hover:bg-[#EDE9FE] rounded-lg transition-colors">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
              <PickerSearch products={products} alreadyAdded={alreadyAdded} onSelect={addProduct} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PickerSearch({ products, alreadyAdded, onSelect }) {
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return products.filter((p) => !alreadyAdded.has(p.id) && (p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q))))
  }, [products, search, alreadyAdded])

  return (
    <>
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
            <p className="text-sm text-gray-500">No matching products</p>
          </div>
        ) : (
          filtered.map((p) => (
            <button key={p.id} onClick={() => onSelect(p)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#F5F3FF] transition-colors text-left">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                <p className="text-xs text-gray-500">{p.category || 'Uncategorized'}</p>
              </div>
              <p className="text-sm font-semibold text-[#7C3AED]">{formatCurrency(p.price)}</p>
            </button>
          ))
        )}
      </div>
    </>
  )
}

// ─── Main Component ──────────────────────────────────────────────────
export default function InvoiceDetail({ invoiceId, autoEdit }) {
  const { user } = useAuth()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [voidModalOpen, setVoidModalOpen] = useState(false)
  const [voiding, setVoiding] = useState(false)
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [updatingFulfillment, setUpdatingFulfillment] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [payments, setPayments] = useState([])
  const [autoEditDone, setAutoEditDone] = useState(false)
  const [completeModalOpen, setCompleteModalOpen] = useState(false)
  const [completing, setCompleting] = useState(false)

  const fetchInvoice = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('invoices')
      .select('*, invoice_items(*)')
      .eq('id', invoiceId)
      .single()

    if (error || !data) {
      setNotFound(true)
    } else {
      setInvoice(data)
    }
    setLoading(false)
  }, [invoiceId])

  const fetchPayments = useCallback(async () => {
    const { data } = await supabase
      .from('invoice_payments')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('payment_date', { ascending: true })
    if (data) setPayments(data)
  }, [invoiceId])

  useEffect(() => {
    fetchInvoice()
    fetchPayments()
  }, [fetchInvoice, fetchPayments])

  // Auto-open edit modal when navigating from list edit button
  useEffect(() => {
    if (autoEdit && invoice && !autoEditDone) {
      setEditModalOpen(true)
      setAutoEditDone(true)
    }
  }, [autoEdit, invoice, autoEditDone])

  async function handleVoid(reason) {
    setVoiding(true)
    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'voided',
        void_reason: reason,
        voided_at: new Date().toISOString(),
        updated_by: user?.email || null,
      })
      .eq('id', invoiceId)

    if (error) {
      toast.error('Failed to void invoice')
      console.error(error)
    } else {
      toast.success('Invoice voided')
      setVoidModalOpen(false)
      await fetchInvoice()
    }
    setVoiding(false)
  }

  async function updateFulfillment(newStatus, extras = {}) {
    setUpdatingFulfillment(true)
    const updates = { fulfillment_status: newStatus, updated_by: user?.email || null, ...extras }

    // Auto-timestamp shipping milestones
    if (newStatus === 'Shipped') {
      updates.shipped_at = new Date().toISOString()
      updates.delivered_at = null
    } else if (newStatus === 'Delivered') {
      updates.delivered_at = new Date().toISOString()
    } else if (newStatus === 'Pending' || newStatus === 'Ready') {
      updates.shipped_at = null
      updates.delivered_at = null
    }

    const { error } = await supabase.from('invoices').update(updates).eq('id', invoiceId)
    if (error) {
      toast.error(`Failed to update to ${newStatus}`)
      console.error(error)
    } else {
      toast.success(`Marked as ${newStatus}`)
      await fetchInvoice()
    }
    setUpdatingFulfillment(false)
  }

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#7C3AED]" />
      </main>
    )
  }

  if (notFound || !invoice) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="p-4 rounded-full bg-[#EDE9FE] inline-block mb-4">
          <AlertTriangle size={36} className="text-[#7C3AED]" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Invoice not found</h2>
        <p className="text-sm text-gray-500 mb-6">This invoice may have been deleted or the link is invalid.</p>
        <a href="#/invoices" className="inline-flex items-center gap-2 text-[#7C3AED] hover:text-[#6D28D9] font-semibold text-sm">
          <ArrowLeft size={16} /> Back to Invoices
        </a>
      </main>
    )
  }

  const items = invoice.invoice_items || []
  const isVoided = invoice.status === 'voided'
  const payStatus = invoice.payment_status || 'Unpaid'
  const pStyle = paymentStatusStyles[payStatus] || paymentStatusStyles.Unpaid
  const amountPaid = Number(invoice.amount_paid || 0)
  const balanceDue = Math.max(0, (invoice.total || 0) - amountPaid)
  const isPreorder = invoice.is_preorder
  const fulfillment = invoice.fulfillment_status || 'Pending'
  const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const isLayaway = invoice.is_layaway || false
  const layawayStatus = invoice.layaway_status || 'Active'
  const createdBy = formatAuditUser(invoice.created_by, 'Unknown')
  const updatedBy = formatAuditUser(invoice.updated_by || invoice.created_by, 'Unknown')
  const auditLines = createdBy.raw && updatedBy.raw && createdBy.raw === updatedBy.raw
    ? [{ label: 'Created & last updated by', user: createdBy }]
    : [
      { label: 'Created by', user: createdBy },
      { label: 'Last updated by', user: updatedBy },
    ]

  async function handleLayawayComplete() {
    setCompleting(true)
    try {
      // Update layaway status
      const { error: invErr } = await supabase.from('invoices').update({
        layaway_status: 'Completed',
        updated_by: user?.email || null,
      }).eq('id', invoiceId)
      if (invErr) { toast.error('Failed to complete layaway'); console.error(invErr); return }

      // Release reservation and decrement stock (non-blocking)
      try {
        const items = invoice.invoice_items || []
        for (const item of items) {
          const { data: prod } = await supabase.from('products').select('qty, reserved_qty').eq('id', item.product_id).single()
          if (prod) {
            await supabase.from('products').update({
              qty: Math.max(0, (prod.qty || 0) - item.qty),
              reserved_qty: Math.max(0, (prod.reserved_qty || 0) - item.qty),
            }).eq('id', item.product_id)
          }
        }
      } catch (reserveErr) {
        console.warn('Failed to update inventory — reconcile manually:', reserveErr)
      }

      toast.success('Layaway completed — inventory released')
      setCompleteModalOpen(false)
      await fetchInvoice()
    } catch (err) {
      console.error('Layaway complete failed:', err)
      toast.error(`Failed: ${err.message}`)
    } finally {
      setCompleting(false)
    }
  }

  async function handleLayawayCancel(newStatus) {
    try {
      // Release reservation only (non-blocking)
      try {
        const items = invoice.invoice_items || []
        for (const item of items) {
          const { data: prod } = await supabase.from('products').select('reserved_qty').eq('id', item.product_id).single()
          if (prod) {
            await supabase.from('products').update({
              reserved_qty: Math.max(0, (prod.reserved_qty || 0) - item.qty),
            }).eq('id', item.product_id)
          }
        }
      } catch (reserveErr) {
        console.warn('Failed to release reservation — reconcile manually:', reserveErr)
      }

      await supabase.from('invoices').update({
        layaway_status: newStatus,
        updated_by: user?.email || null,
      }).eq('id', invoiceId)

      toast.success(`Layaway ${newStatus.toLowerCase()} — reservation released`)
      await fetchInvoice()
    } catch (err) {
      console.error('Layaway cancel failed:', err)
      toast.error(`Failed: ${err.message}`)
    }
  }

  return (
    <>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top bar (hidden in print) */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <a
            href="#/invoices"
            className="inline-flex items-center gap-1.5 text-[#7C3AED] hover:text-[#6D28D9] font-medium text-sm transition-colors"
          >
            <ArrowLeft size={18} /> Back to Invoices
          </a>
          <div className="flex items-center gap-2 flex-wrap">
            {!isVoided && (
              <button
                onClick={() => setEditModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#7C3AED] hover:bg-[#EDE9FE] border border-[#EDE9FE] rounded-lg transition-colors"
              >
                <Edit3 size={16} /> Edit Invoice
              </button>
            )}
            {!isVoided && (
              <button
                onClick={() => setPaymentModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-green-600 hover:bg-green-50 border border-green-200 rounded-lg transition-colors"
              >
                <DollarSign size={16} /> Record Payment
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#7C3AED] hover:bg-[#EDE9FE] border border-[#EDE9FE] rounded-lg transition-colors"
            >
              <Printer size={16} /> Print
            </button>
            {!isVoided && (
              <button
                onClick={() => setVoidModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
              >
                <XCircle size={16} /> Void Invoice
              </button>
            )}
          </div>
        </div>

        {/* Pre-order workflow buttons */}
        {isPreorder && !isVoided && (
          <div className="flex flex-wrap items-center gap-2 mb-6 print:hidden">
            {fulfillment === 'Pending' && (
              <button
                onClick={() => setLinkModalOpen(true)}
                disabled={updatingFulfillment}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] rounded-lg transition-colors disabled:opacity-50"
              >
                <Package size={16} /> Mark as Arrived &amp; Link to Product
              </button>
            )}
            {fulfillment === 'Ready' && (
              <button
                onClick={() => updateFulfillment('Shipped')}
                disabled={updatingFulfillment}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {updatingFulfillment ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
                Mark as Shipped
              </button>
            )}
            {fulfillment === 'Shipped' && (
              <button
                onClick={() => updateFulfillment('Delivered')}
                disabled={updatingFulfillment}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {updatingFulfillment ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Mark as Delivered
              </button>
            )}
            <span className="text-xs text-gray-400 ml-2">
              Fulfillment: <span className="font-semibold text-gray-600">{fulfillment}</span>
            </span>
          </div>
        )}

        {/* Invoice card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#EDE9FE] overflow-hidden relative print:shadow-none print:border-gray-200 print:rounded-none">
          {/* Voided watermark */}
          {isVoided && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <span className="text-red-500/10 text-[120px] font-extrabold uppercase tracking-widest -rotate-30 select-none">
                Voided
              </span>
            </div>
          )}

          {/* Payment status watermark (non-voided) */}
          {!isVoided && payStatus !== 'Unpaid' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <span className={`${pStyle.stamp} text-[100px] font-extrabold uppercase tracking-widest -rotate-30 select-none`}>
                {payStatus}
              </span>
            </div>
          )}

          <div className="relative z-20 p-6 sm:p-8">
            {/* Pre-order banner */}
            {isPreorder && (
              <div className="mb-6 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-full uppercase">
                  <Package size={14} /> Pre-Order
                </span>
                {invoice.expected_arrival_date && (
                  <span className="text-sm text-purple-700">
                    Expected arrival: <span className="font-semibold">{formatDateShort(invoice.expected_arrival_date)}</span>
                  </span>
                )}
                <span className="text-sm text-purple-700">
                  Fulfillment: <span className="font-semibold">{fulfillment}</span>
                </span>
                {invoice.shipped_at && (
                  <span className="text-sm text-blue-700">
                    Shipped: <span className="font-semibold">{formatDate(invoice.shipped_at)}</span>
                    {invoice.shipping_option && <span className="text-blue-500"> via {invoice.shipping_option}</span>}
                  </span>
                )}
                {invoice.delivered_at && (
                  <span className="text-sm text-green-700">
                    Delivered: <span className="font-semibold">{formatDate(invoice.delivered_at)}</span>
                  </span>
                )}
              </div>
            )}

            {/* Layaway banner */}
            {isLayaway && (
              <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full uppercase">
                  <Tag size={14} /> Layaway
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  layawayStatus === 'Active' ? 'bg-blue-100 text-blue-700' :
                  layawayStatus === 'Completed' ? 'bg-green-100 text-green-700' :
                  layawayStatus === 'Cancelled' ? 'bg-gray-200 text-gray-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {layawayStatus}
                </span>
                {invoice.layaway_deposit_amount && (
                  <span className="text-sm text-indigo-700">
                    Deposit: <span className="font-semibold">{formatCurrency(invoice.layaway_deposit_amount)}</span>
                  </span>
                )}
                {invoice.layaway_due_date && (
                  <span className="text-sm text-indigo-700">
                    Due: <span className="font-semibold">{formatDateShort(invoice.layaway_due_date)}</span>
                  </span>
                )}
                {(() => {
                  if (!invoice.layaway_due_date || layawayStatus !== 'Active') return null
                  const daysLeft = Math.ceil((new Date(invoice.layaway_due_date) - new Date()) / (1000 * 60 * 60 * 24))
                  if (daysLeft < 0 && balanceDue > 0) return <span className="text-xs font-bold text-red-600">OVERDUE</span>
                  if (daysLeft >= 0) return <span className="text-xs text-indigo-500">{daysLeft} day{daysLeft === 1 ? '' : 's'} left</span>
                  return null
                })()}
              </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8 pb-6 border-b border-[#EDE9FE] print:border-gray-200">
              <div className="flex items-center gap-3">
                <img
                  src={LOGO_URL}
                  alt="Fabulous Finds by Za"
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-[#EDE9FE] print:ring-gray-200"
                />
                <div>
                  <h1 className="text-lg font-bold text-[#7C3AED] print:text-gray-900">Fabulous Finds by Za</h1>
                  <p className="text-xs text-gray-400">Inventory &amp; Invoice System</p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-2xl font-extrabold text-[#7C3AED] tracking-tight print:text-gray-900">INVOICE</p>
                <p className="text-sm font-semibold text-gray-700 mt-1">{invoice.invoice_number}</p>
                <p className="text-sm text-gray-500">{formatDate(invoice.created_at)}</p>
                <div className="mt-1 space-y-0.5 text-xs text-gray-400 print:text-gray-500">
                  {auditLines.map(({ label, user }) => (
                    <p key={label}>
                      {label}: {user.primary}
                      {user.secondary && <span className="text-[11px] text-gray-300 print:text-gray-400"> ({user.secondary})</span>}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {/* Customer + Status row */}
            <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mb-8">
              <div>
                {(invoice.customer_name || invoice.customer_contact) && (
                  <>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Bill To</p>
                    {invoice.customer_name && <p className="text-sm font-semibold text-gray-800">{invoice.customer_name}</p>}
                    {invoice.customer_contact && <p className="text-sm text-gray-500">{invoice.customer_contact}</p>}
                  </>
                )}
              </div>
              <div className="flex flex-col items-start sm:items-end gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-400 uppercase">Status</span>
                  {isVoided ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">Voided</span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Active</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-400 uppercase">Payment</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${pStyle.bg}`}>{payStatus}</span>
                </div>
                {invoice.payment_method && (
                  <p className="text-sm text-gray-500">
                    <span className="text-xs font-medium text-gray-400 uppercase mr-1">Method</span>
                    {invoice.payment_method}
                  </p>
                )}
                {invoice.shipping_option && (
                  <p className="text-sm text-gray-500">
                    <span className="text-xs font-medium text-gray-400 uppercase mr-1">Shipping</span>
                    {invoice.shipping_option}
                    {Number(invoice.shipping_fee || 0) > 0 && (
                      <span className="text-gray-400"> ({formatCurrency(invoice.shipping_fee)})</span>
                    )}
                  </p>
                )}
                {isVoided && invoice.voided_at && (
                  <p className="text-xs text-gray-400">Voided on {formatDate(invoice.voided_at)}</p>
                )}
              </div>
            </div>

            {/* Line items table */}
            <div className="mb-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F5F3FF] print:bg-gray-50">
                    <th className="text-left px-4 py-3 font-semibold text-[#7C3AED] print:text-gray-700">#</th>
                    <th className="text-left px-4 py-3 font-semibold text-[#7C3AED] print:text-gray-700">Product</th>
                    <th className="text-center px-4 py-3 font-semibold text-[#7C3AED] print:text-gray-700">Qty</th>
                    <th className="text-right px-4 py-3 font-semibold text-[#7C3AED] print:text-gray-700">Unit Price</th>
                    <th className="text-right px-4 py-3 font-semibold text-[#7C3AED] print:text-gray-700">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id} className="border-b border-[#EDE9FE]/60 print:border-gray-200">
                      <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{item.product_name}</p>
                        {item.product_category && <p className="text-xs text-gray-400">{item.product_category}</p>}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-700">{item.qty}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(item.unit_price)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">{formatCurrency(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-full max-w-xs space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium text-gray-800">{formatCurrency(invoice.subtotal)}</span>
                </div>
                {invoice.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Discount</span>
                    <span className="font-medium text-red-500">-{formatCurrency(invoice.discount)}</span>
                  </div>
                )}
                {Number(invoice.shipping_fee || 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Shipping Fee</span>
                    <span className="font-medium text-gray-800">{formatCurrency(invoice.shipping_fee)}</span>
                  </div>
                )}
                <div className="border-t border-[#EDE9FE] print:border-gray-200 pt-2 flex justify-between">
                  <span className="font-semibold text-[#7C3AED] print:text-gray-900">Total</span>
                  <span className="text-xl font-bold text-[#7C3AED] print:text-gray-900">{formatCurrency(invoice.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Amount Paid</span>
                  <span className="font-medium text-green-600">{formatCurrency(amountPaid)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-semibold">Balance Due</span>
                  <span className={`font-bold ${balanceDue > 0 ? 'text-red-500' : 'text-green-600'}`}>{formatCurrency(balanceDue)}</span>
                </div>
              </div>
            </div>

            {/* Payment History */}
            {payments.length > 0 && (
              <div className="mb-8 p-4 bg-[#F5F3FF] rounded-xl print:bg-gray-50 print:rounded-none print:border print:border-gray-200">
                <p className="text-xs font-medium text-[#7C3AED] uppercase mb-3">Payment History</p>
                <div className="border-t border-[#DDD6FE] mb-2" />
                <div className="space-y-2">
                  {payments.map((p) => (
                    <div key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span className="text-gray-500 min-w-[160px]">{formatDate(p.payment_date)}</span>
                      <span className="font-semibold text-gray-800 min-w-[100px]">{formatCurrency(p.amount)}</span>
                      <span className="text-gray-600">{p.payment_method}</span>
                      {p.notes && <span className="text-gray-400 italic">"{p.notes}"</span>}
                    </div>
                  ))}
                </div>
                <div className="border-t border-[#DDD6FE] mt-3 pt-2 flex justify-between text-sm">
                  <span className="font-semibold text-[#7C3AED]">Total Paid</span>
                  <span className="font-bold text-[#7C3AED]">{formatCurrency(totalPayments)}</span>
                </div>
              </div>
            )}

            {/* Notes */}
            {invoice.notes && (
              <div className="mb-8 p-4 bg-[#F5F3FF] rounded-xl print:bg-gray-50 print:rounded-none print:border print:border-gray-200">
                <p className="text-xs font-medium text-gray-400 uppercase mb-1">Notes</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}

            {/* Void reason */}
            {isVoided && invoice.void_reason && (
              <div className="mb-8 p-4 bg-red-50 rounded-xl border border-red-100 print:rounded-none">
                <p className="text-xs font-medium text-red-400 uppercase mb-1">Void Reason</p>
                <p className="text-sm text-red-600 whitespace-pre-wrap">{invoice.void_reason}</p>
              </div>
            )}

            {/* Layaway terms (print) */}
            {isLayaway && (
              <div className="mb-8 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 print:bg-gray-50 print:rounded-none print:border-gray-200">
                <p className="text-xs font-medium text-indigo-600 uppercase mb-2">Layaway Terms</p>
                <div className="text-xs text-gray-600 space-y-1 whitespace-pre-wrap">
                  <p>- Minimum deposit: 30% due at reservation</p>
                  <p>- Full payment due by: {invoice.layaway_due_date ? formatDateShort(invoice.layaway_due_date) : 'N/A'}</p>
                  <p>- Items held in store, not released until fully paid</p>
                  <p>- Cancellation: 80% refund of amount paid, 20% admin fee</p>
                  <p>- Default: 50% deposit forfeit after 2 missed payments</p>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-[#EDE9FE] print:border-gray-200 pt-6 text-center">
              <p className="text-sm font-medium text-[#7C3AED] print:text-gray-700">
                Thank you for shopping with Fabulous Finds by Za!
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Fabulous Finds by Za &middot; Inventory &amp; Invoice System
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      {voidModalOpen && (
        <VoidModal voiding={voiding} onConfirm={handleVoid} onClose={() => setVoidModalOpen(false)} />
      )}
      {linkModalOpen && (
        <LinkProductModal invoice={invoice} userEmail={user?.email} onClose={() => setLinkModalOpen(false)} onLinked={fetchInvoice} />
      )}
      {editModalOpen && (
        <EditInvoiceModal
          invoice={invoice}
          onClose={() => setEditModalOpen(false)}
          onSaved={() => { fetchInvoice(); fetchPayments() }}
          userEmail={user?.email}
        />
      )}
      {paymentModalOpen && (
        <RecordPaymentModal
          invoice={invoice}
          onClose={() => setPaymentModalOpen(false)}
          onSaved={() => { fetchInvoice(); fetchPayments() }}
          onLayawayFullyPaid={() => { fetchInvoice(); fetchPayments(); setCompleteModalOpen(true) }}
          userEmail={user?.email}
        />
      )}
      {completeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 print:hidden" onClick={() => setCompleteModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-green-100">
                <CheckCircle2 size={22} className="text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 text-lg">Layaway Fully Paid</h3>
            </div>
            <p className="text-sm text-gray-600 mb-5">This layaway is fully paid. Mark as Completed and release inventory?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setCompleteModalOpen(false)} disabled={completing} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors">
                Not Yet
              </button>
              <button onClick={handleLayawayComplete} disabled={completing} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50">
                {completing ? <><Loader2 size={16} className="animate-spin" /> Completing...</> : <><CheckCircle2 size={16} /> Yes, Complete</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          header, .print\\:hidden { display: none !important; }
          main { padding: 0 !important; max-width: 100% !important; }
          * { box-shadow: none !important; }
        }
      `}</style>
    </>
  )
}
