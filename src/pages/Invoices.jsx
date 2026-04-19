import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Eye, FileText, Loader2, Package } from 'lucide-react'
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

function PaymentStatusBadge({ status }) {
  const s = status || 'Unpaid'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${paymentStatusStyles[s] || paymentStatusStyles.Unpaid}`}>
      {s}
    </span>
  )
}

export default function Invoices({ onNavigate, preorderOnly: initialPreorderOnly }) {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('All')
  const [preorderOnly, setPreorderOnly] = useState(initialPreorderOnly || false)
  const [fulfillmentFilter, setFulfillmentFilter] = useState('All')

  useEffect(() => {
    async function fetchInvoices() {
      setLoading(true)
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data) {
        setInvoices(data)
      }
      setLoading(false)
    }
    fetchInvoices()
  }, [])

  // Pre-order summary
  const preorderSummary = useMemo(() => {
    const preorders = invoices.filter((inv) => inv.is_preorder)
    const totalBalance = preorders.reduce((sum, inv) => sum + Math.max(0, (inv.total || 0) - (inv.amount_paid || 0)), 0)
    const byFulfillment = {}
    for (const inv of preorders) {
      const fs = inv.fulfillment_status || 'Pending'
      byFulfillment[fs] = (byFulfillment[fs] || 0) + 1
    }
    return { count: preorders.length, totalBalance, byFulfillment }
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
      if (preorderOnly && !inv.is_preorder) return false
      if (preorderOnly && fulfillmentFilter !== 'All' && (inv.fulfillment_status || 'Pending') !== fulfillmentFilter) return false
      return true
    })
  }, [invoices, search, paymentFilter, preorderOnly, fulfillmentFilter])

  const filterSelectClass = 'px-3 py-2 text-sm border border-[#EDE9FE] rounded-lg bg-white focus:ring-2 focus:ring-[#7C3AED] focus:border-[#7C3AED] outline-none'

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-[#7C3AED]">
            {preorderOnly ? 'Pre-orders' : 'Invoices'}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {preorderOnly ? 'Track and manage pre-ordered items' : 'Manage and track all your invoices'}
          </p>
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
      {preorderOnly && preorderSummary.count > 0 && (
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
        <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={preorderOnly}
            onChange={(e) => setPreorderOnly(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-[#7C3AED] focus:ring-[#7C3AED]"
          />
          <Package size={16} className="text-[#7C3AED]" />
          Pre-orders Only
        </label>
        {preorderOnly && (
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
        <div className="bg-white rounded-xl shadow-sm border border-[#EDE9FE] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F5F3FF] border-b border-[#EDE9FE]">
                  <th className="text-left px-4 py-3 font-semibold text-[#7C3AED]">Invoice #</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#7C3AED]">Customer</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#7C3AED]">Date</th>
                  <th className="text-right px-4 py-3 font-semibold text-[#7C3AED]">Total</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#7C3AED]">Payment</th>
                  <th className="text-center px-4 py-3 font-semibold text-[#7C3AED]">Pay Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#7C3AED]">Shipping</th>
                  <th className="text-center px-4 py-3 font-semibold text-[#7C3AED]">Status</th>
                  <th className="text-center px-4 py-3 font-semibold text-[#7C3AED]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-[#EDE9FE]/60 hover:bg-[#EDE9FE]/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-[#6D28D9]">
                      <div className="flex items-center gap-1.5">
                        {inv.invoice_number}
                        {inv.is_preorder && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                            PRE-ORDER
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{inv.customer_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(inv.created_at)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">
                      {formatCurrency(inv.total)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{inv.payment_method || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <PaymentStatusBadge status={inv.payment_status} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">{inv.shipping_option || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      {inv.status === 'voided' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                          Voided
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <a
                        href={`#/invoices/${inv.id}`}
                        className="inline-flex items-center gap-1 text-[#7C3AED] hover:text-[#6D28D9] font-medium text-sm transition-colors"
                      >
                        <Eye size={15} />
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  )
}
