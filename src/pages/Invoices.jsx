import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Eye, FileText, Loader2, Package, Pencil, Tag, Clock, AlertCircle, Check } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { supabase } from '../lib/supabase'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true
  })
}

function formatCurrency(amount) {
  return `₱${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const paymentStatusStyles = {
  Unpaid: 'bg-red-100 text-red-700',
  'Partially Paid': 'bg-yellow-100 text-yellow-700',
  Paid: 'bg-green-100 text-green-700',
  Refunded: 'bg-gray-100 text-gray-600',
  Cancelled: 'bg-gray-200 text-gray-700',
}

const fulfillmentStyles = {
  Pending: 'bg-yellow-100 text-yellow-700',
  Ready: 'bg-blue-100 text-blue-700',
  Shipped: 'bg-indigo-100 text-indigo-700',
  Delivered: 'bg-green-100 text-green-700',
  Cancelled: 'bg-gray-200 text-gray-700',
}

const shippingStyles = {
  'J&T': 'bg-orange-100 text-orange-700',
  Lalamove: 'bg-green-100 text-green-700',
  LBC: 'bg-red-100 text-red-700',
}

function PaymentStatusBadge({ status }) {
  const s = status || 'Unpaid'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${paymentStatusStyles[s] || paymentStatusStyles.Unpaid}`}>
      {s}
    </span>
  )
}

function ShippingBadge({ option }) {
  if (!option) return <span className="text-gray-400 text-sm">—</span>
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${shippingStyles[option] || 'bg-gray-100 text-gray-600'}`}>
      {option}
    </span>
  )
}

function FulfillmentBadge({ status }) {
  const s = status || 'Pending'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${fulfillmentStyles[s] || 'bg-gray-100 text-gray-600'}`}>
      {s}
    </span>
  )
}

function LayawayDueIcon({ invoice }) {
  if (!invoice.is_layaway || invoice.layaway_status !== 'Active') return null
  const due = invoice.layaway_due_date ? new Date(invoice.layaway_due_date) : null
  if (!due) return null
  const now = new Date()
  const daysLeft = Math.ceil((due - now) / (1000 * 60 * 60 * 24))
  const balance = Math.max(0, (invoice.total || 0) - (invoice.amount_paid || 0))
  if (daysLeft < 0 && balance > 0) return <span title="Overdue" className="text-red-500 text-xs font-bold flex items-center gap-0.5"><AlertCircle size={12} />Overdue</span>
  if (daysLeft <= 7 && daysLeft >= 0) return <span title={`Due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`} className="text-amber-500"><Clock size={14} /></span>
  return null
}

function getYearForInvoice(invoice) {
  if (invoice.created_at) return new Date(invoice.created_at).getFullYear()
  const match = String(invoice.invoice_number || '').match(/^[A-Za-z]+-(\d{4})-\d{4}$/)
  if (match) return Number(match[1])
  return new Date().getFullYear()
}

function buildCanonicalInvoiceNumber(year, seq) {
  return `FFC-${year}-${String(seq).padStart(4, '0')}`
}

function getInvoiceOrderType(invoice) {
  if (invoice.is_preorder) return 'preorder'
  if (invoice.is_layaway) return 'layaway'
  if (invoice.order_type === 'preorder' || invoice.order_type === 'layaway') return invoice.order_type
  return 'cash_sale'
}

export default function Invoices({ onNavigate }) {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('All')
  const [orderTypeFilters, setOrderTypeFilters] = useState(new Set())
  const [fulfillmentFilter, setFulfillmentFilter] = useState('All')

  const toggleOrderTypeFilter = (key) => {
    setOrderTypeFilters((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  useEffect(() => {
    async function fetchInvoices() {
      setLoading(true)
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data) {
        const chronological = [...data].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
        const yearCounters = new Map()
        const pendingUpdates = []

        for (const inv of chronological) {
          const year = getYearForInvoice(inv)
          const nextSeq = (yearCounters.get(year) || 0) + 1
          yearCounters.set(year, nextSeq)
          const canonical = buildCanonicalInvoiceNumber(year, nextSeq)
          if (inv.invoice_number !== canonical) {
            pendingUpdates.push({ id: inv.id, invoice_number: canonical })
          }
        }

        if (pendingUpdates.length > 0) {
          const updateResults = await Promise.all(
            pendingUpdates.map((update) =>
              supabase
                .from('invoices')
                .update({ invoice_number: update.invoice_number })
                .eq('id', update.id)
            )
          )
          const firstError = updateResults.find((r) => r.error)?.error
          if (firstError) {
            toast.error(`Failed to repair old invoice numbers: ${firstError.message}`)
          } else {
            toast.success(`Repaired ${pendingUpdates.length} invoice number${pendingUpdates.length === 1 ? '' : 's'}`)
            const patched = data.map((inv) => {
              const found = pendingUpdates.find((u) => u.id === inv.id)
              return found ? { ...inv, invoice_number: found.invoice_number } : inv
            })
            setInvoices(patched)
            setLoading(false)
            return
          }
        }

        setInvoices(data)
      }
      setLoading(false)
    }
    fetchInvoices()
  }, [])

  // Pre-order summary
  const preorderSummary = useMemo(() => {
    const preorders = invoices.filter((inv) => getInvoiceOrderType(inv) === 'preorder')
    const totalBalance = preorders.reduce((sum, inv) => sum + Math.max(0, (inv.total || 0) - (inv.amount_paid || 0)), 0)
    const byFulfillment = {}
    for (const inv of preorders) {
      const fs = inv.fulfillment_status || 'Pending'
      byFulfillment[fs] = (byFulfillment[fs] || 0) + 1
    }
    return { count: preorders.length, totalBalance, byFulfillment }
  }, [invoices])

  // Layaway summary
  const layawaySummary = useMemo(() => {
    const layaways = invoices.filter((inv) => getInvoiceOrderType(inv) === 'layaway')
    const active = layaways.filter((inv) => inv.layaway_status === 'Active')
    const totalBalance = active.reduce((sum, inv) => sum + Math.max(0, (inv.total || 0) - (inv.amount_paid || 0)), 0)
    const now = new Date()
    const dueThisWeek = active.filter((inv) => {
      const due = inv.layaway_due_date ? new Date(inv.layaway_due_date) : null
      if (!due) return false
      const daysLeft = Math.ceil((due - now) / (1000 * 60 * 60 * 24))
      return daysLeft >= 0 && daysLeft <= 7
    }).length
    const overdue = active.filter((inv) => {
      const due = inv.layaway_due_date ? new Date(inv.layaway_due_date) : null
      if (!due) return false
      return due < now && Math.max(0, (inv.total || 0) - (inv.amount_paid || 0)) > 0
    }).length
    return { total: layaways.length, active: active.length, totalBalance, dueThisWeek, overdue }
  }, [invoices])

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      if (search) {
        const q = search.toLowerCase()
        const matchSearch =
          (inv.invoice_number && inv.invoice_number.toLowerCase().includes(q)) ||
          (inv.customer_name && inv.customer_name.toLowerCase().includes(q))
        if (!matchSearch) return false
      }
      if (paymentFilter !== 'All' && (inv.payment_status || 'Unpaid') !== paymentFilter) return false
      if (orderTypeFilters.size > 0) {
        const orderType = getInvoiceOrderType(inv)
        const cashMatch = orderTypeFilters.has('cash_sale') && orderType === 'cash_sale'
        const preMatch = orderTypeFilters.has('preorder') && orderType === 'preorder'
        const layMatch = orderTypeFilters.has('layaway') && orderType === 'layaway'
        if (!cashMatch && !preMatch && !layMatch) return false
      }
      if (orderTypeFilters.has('preorder') && fulfillmentFilter !== 'All' && (inv.fulfillment_status || 'Pending') !== fulfillmentFilter) return false
      return true
    })
  }, [invoices, search, paymentFilter, orderTypeFilters, fulfillmentFilter])

  const filterSelectClass = 'px-3 py-2 text-sm border border-[#EDE9FE] rounded-lg bg-white focus:ring-2 focus:ring-[#7C3AED] focus:border-[#7C3AED] outline-none'

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-[#7C3AED]">Invoices</h2>
          <p className="mt-1 text-sm text-gray-500">Manage and track all your invoices</p>
        </div>
        <a
          href="#/invoices/new"
          className="inline-flex items-center gap-2 bg-[#7C3AED] text-white px-5 py-2.5 rounded-lg hover:bg-[#6D28D9] transition-colors font-semibold text-sm shadow-sm"
        >
          <Plus size={18} />
          New Invoice
        </a>
      </div>

      {/* Pre-order summary banner */}
      {orderTypeFilters.has('preorder') && preorderSummary.count > 0 && (
        <div className="mb-6 bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-gray-500">Total Pre-orders:</span>
              <span className="ml-1 font-bold text-[#7C3AED]">{preorderSummary.count}</span>
            </div>
            <div>
              <span className="text-gray-500">Total Balance Due:</span>
              <span className="ml-1 font-bold text-red-500">{formatCurrency(preorderSummary.totalBalance)}</span>
            </div>
            {Object.entries(preorderSummary.byFulfillment).map(([status, count]) => (
              <div key={status}>
                <span className="text-gray-500">{status}:</span>
                <span className="ml-1 font-bold text-gray-700">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Layaway summary banner */}
      {orderTypeFilters.has('layaway') && layawaySummary.active > 0 && (
        <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-gray-500">Active Layaways:</span>
              <span className="ml-1 font-bold text-indigo-700">{layawaySummary.active}</span>
            </div>
            <div>
              <span className="text-gray-500">Total Balance Due:</span>
              <span className="ml-1 font-bold text-red-500">{formatCurrency(layawaySummary.totalBalance)}</span>
            </div>
            {layawaySummary.dueThisWeek > 0 && (
              <div>
                <span className="text-gray-500">Due This Week:</span>
                <span className="ml-1 font-bold text-amber-600">{layawaySummary.dueThisWeek}</span>
              </div>
            )}
            {layawaySummary.overdue > 0 && (
              <div>
                <span className="text-gray-500">Overdue:</span>
                <span className="ml-1 font-bold text-red-600">{layawaySummary.overdue}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search & filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1 min-w-[200px]">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C3AED]" />
          <input
            type="text"
            placeholder="Search by invoice # or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border-2 border-[#EDE9FE] rounded-xl focus:ring-4 focus:ring-[#EDE9FE] focus:border-[#7C3AED] outline-none transition-all"
          />
        </div>
        <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className={filterSelectClass}>
          <option value="All">All Payment Status</option>
          <option value="Unpaid">Unpaid</option>
          <option value="Partially Paid">Partially Paid</option>
          <option value="Paid">Paid</option>
          <option value="Refunded">Refunded</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        {[
          { key: 'cash_sale', label: 'Cash Sales' },
          { key: 'preorder', label: 'Pre-orders' },
          { key: 'layaway', label: 'Layaways' },
        ].map(({ key, label }) => {
          const active = orderTypeFilters.has(key)
          return (
            <button
              key={key}
              onClick={() => toggleOrderTypeFilter(key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                active
                  ? 'bg-[#7C3AED] text-white border-[#6D28D9]'
                  : 'bg-white text-gray-600 border-[#DDD6FE] hover:border-[#7C3AED]'
              }`}
            >
              {active && <Check size={13} />}
              {label}
            </button>
          )
        })}
        {orderTypeFilters.has('preorder') && (
          <select value={fulfillmentFilter} onChange={(e) => setFulfillmentFilter(e.target.value)} className={filterSelectClass}>
            <option value="All">All Fulfillment</option>
            <option value="Pending">Pending</option>
            <option value="Ready">Ready</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[#7C3AED]" />
        </div>
      ) : filtered.length === 0 && invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-full bg-[#EDE9FE] mb-4">
            <FileText size={36} className="text-[#7C3AED]" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">No invoices yet</h3>
          <p className="text-sm text-gray-500 mb-6">Create your first one!</p>
          <a
            href="#/invoices/new"
            className="inline-flex items-center gap-2 bg-[#7C3AED] text-white px-5 py-2.5 rounded-lg hover:bg-[#6D28D9] transition-colors font-semibold text-sm shadow-sm"
          >
            <Plus size={18} />
            New Invoice
          </a>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search size={32} className="text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">No invoices match your filters</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-[#EDE9FE] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F5F3FF] border-b border-[#EDE9FE]">
                    <th className="text-left px-4 py-3 font-semibold text-[#7C3AED]">Invoice #</th>
                    <th className="text-left px-4 py-3 font-semibold text-[#7C3AED]">Customer</th>
                    <th className="text-left px-4 py-3 font-semibold text-[#7C3AED]">Date</th>
                    <th className="text-right px-4 py-3 font-semibold text-[#7C3AED]">Total</th>
                    <th className="text-left px-4 py-3 font-semibold text-[#7C3AED]">Payment</th>
                    <th className="text-center px-4 py-3 font-semibold text-[#7C3AED]">Status</th>
                    <th className="text-center px-4 py-3 font-semibold text-[#7C3AED]">Shipping</th>
                    {orderTypeFilters.has('preorder') && <th className="text-center px-4 py-3 font-semibold text-[#7C3AED]">Fulfillment</th>}
                    {/* Keep Updated By after Shipping/Fulfillment and before Actions */}
                    <th className="text-left px-4 py-3 font-semibold text-[#7C3AED]">Updated By</th>
                    <th className="text-center px-4 py-3 font-semibold text-[#7C3AED]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => {
                    const invoiceOrderType = getInvoiceOrderType(inv)
                    return (
                      <tr
                        key={inv.id}
                        className="border-b border-[#EDE9FE]/60 hover:bg-[#EDE9FE]/30 transition-colors"
                      >
                      <td className="px-4 py-3 font-medium text-[#6D28D9]">
                        <div className="flex items-center gap-1.5">
                          {inv.invoice_number}
                          {invoiceOrderType === 'preorder' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                              PRE-ORDER
                            </span>
                          )}
                          {invoiceOrderType === 'layaway' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                              LAYAWAY
                            </span>
                          )}
                          <LayawayDueIcon invoice={inv} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        <p>{inv.customer_name || '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(inv.created_at)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">
                        {formatCurrency(inv.total)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{inv.payment_method || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <PaymentStatusBadge status={inv.payment_status} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ShippingBadge option={inv.shipping_option} />
                      </td>
                      {orderTypeFilters.has('preorder') && (
                        <td className="px-4 py-3 text-center">
                          {invoiceOrderType === 'preorder' ? (
                            <FulfillmentBadge status={inv.fulfillment_status} />
                          ) : '—'}
                        </td>
                      )}
                      {/* Keep Updated By after Shipping/Fulfillment and before Actions */}
                      <td className="px-4 py-3 text-gray-600">{inv.updated_by || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-2">
                          <a
                            href={`#/invoices/${inv.id}`}
                            className="inline-flex items-center gap-1 text-[#7C3AED] hover:text-[#6D28D9] font-medium text-sm transition-colors"
                          >
                            <Eye size={15} />
                            View
                          </a>
                          <a
                            href={`#/invoices/${inv.id}/edit`}
                            className="inline-flex items-center gap-1 text-gray-400 hover:text-[#7C3AED] font-medium text-sm transition-colors"
                            title="Edit Invoice"
                          >
                            <Pencil size={14} />
                          </a>
                        </div>
                      </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((inv) => {
              const invoiceOrderType = getInvoiceOrderType(inv)
              return (
                <div key={inv.id} className="bg-white rounded-xl shadow-sm border border-[#EDE9FE] p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="font-semibold text-[#6D28D9]">{inv.invoice_number}</span>
                        {invoiceOrderType === 'preorder' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                            PRE-ORDER
                          </span>
                        )}
                        {invoiceOrderType === 'layaway' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                            LAYAWAY
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700">{inv.customer_name || '—'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Updated By: {inv.updated_by || '—'}</p>
                      <p className="text-xs text-gray-400">{formatDate(inv.created_at)}</p>
                    </div>
                    <p className="text-lg font-bold text-gray-800">{formatCurrency(inv.total)}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <PaymentStatusBadge status={inv.payment_status} />
                    <ShippingBadge option={inv.shipping_option} />
                    {invoiceOrderType === 'preorder' && <FulfillmentBadge status={inv.fulfillment_status} />}
                    {invoiceOrderType === 'layaway' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                        {inv.layaway_status || 'Active'}
                      </span>
                    )}
                    <LayawayDueIcon invoice={inv} />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{inv.payment_method || '—'}</span>
                    <div className="inline-flex items-center gap-3">
                      <a
                        href={`#/invoices/${inv.id}`}
                        className="inline-flex items-center gap-1 text-[#7C3AED] hover:text-[#6D28D9] font-medium text-sm transition-colors"
                      >
                        <Eye size={15} />
                        View
                      </a>
                      <a
                        href={`#/invoices/${inv.id}/edit`}
                        className="inline-flex items-center gap-1 text-gray-400 hover:text-[#7C3AED] font-medium text-sm transition-colors"
                        title="Edit Invoice"
                      >
                        <Pencil size={14} />
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </main>
  )
}
