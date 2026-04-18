import { useState, useEffect } from 'react'
import { Plus, Search, Eye, FileText, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

function formatCurrency(amount) {
  return `₱${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function Invoices({ onNavigate }) {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

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

  const filtered = invoices.filter((inv) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (inv.invoice_number && inv.invoice_number.toLowerCase().includes(q)) ||
      (inv.customer_name && inv.customer_name.toLowerCase().includes(q))
    )
  })

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

        {/* Search bar */}
        <div className="mb-6 max-w-md">
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C3AED]" />
            <input
              type="text"
              placeholder="Search by invoice # or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border-2 border-[#EDE9FE] rounded-xl focus:ring-4 focus:ring-[#EDE9FE] focus:border-[#7C3AED] outline-none transition-all"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-[#7C3AED]" />
          </div>
        ) : filtered.length === 0 && invoices.length === 0 ? (
          /* Empty state — no invoices at all */
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
          /* No search results */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search size={32} className="text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No invoices match "{search}"</p>
          </div>
        ) : (
          /* Invoice table */
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
                      <td className="px-4 py-3 font-medium text-[#6D28D9]">{inv.invoice_number}</td>
                      <td className="px-4 py-3 text-gray-700">{inv.customer_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(inv.created_at)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">
                        {formatCurrency(inv.total)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {inv.payment_method
                          ? inv.payment_method.charAt(0).toUpperCase() + inv.payment_method.slice(1)
                          : '—'}
                      </td>
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
