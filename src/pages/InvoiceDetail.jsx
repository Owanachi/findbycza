import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Printer, XCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

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

function formatCurrency(amount) {
  return `₱${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function capitalize(str) {
  if (!str) return '—'
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ─── Void Confirmation Modal ─────────────────────────────────────────
function VoidModal({ onConfirm, onClose, voiding }) {
  const [reason, setReason] = useState('')

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 print:hidden" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-full bg-red-100">
            <AlertTriangle size={22} className="text-red-600" />
          </div>
          <h3 className="font-semibold text-gray-900 text-lg">Void this invoice?</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Stock will be restored for all items. This cannot be undone.
        </p>
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
          <button
            onClick={onClose}
            disabled={voiding}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason.trim() || null)}
            disabled={voiding}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {voiding ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Voiding...
              </>
            ) : (
              <>
                <XCircle size={16} />
                Void Invoice
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────
export default function InvoiceDetail({ invoiceId }) {
  const { user } = useAuth()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [voidModalOpen, setVoidModalOpen] = useState(false)
  const [voiding, setVoiding] = useState(false)

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

  useEffect(() => {
    fetchInvoice()
  }, [fetchInvoice])

  async function handleVoid(reason) {
    setVoiding(true)
    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'voided',
        void_reason: reason,
        voided_at: new Date().toISOString(),
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

  // ── Loading ──
  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#7C3AED]" />
      </main>
    )
  }

  // ── Not found ──
  if (notFound || !invoice) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="p-4 rounded-full bg-[#EDE9FE] inline-block mb-4">
          <AlertTriangle size={36} className="text-[#7C3AED]" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Invoice not found</h2>
        <p className="text-sm text-gray-500 mb-6">This invoice may have been deleted or the link is invalid.</p>
        <a
          href="#/invoices"
          className="inline-flex items-center gap-2 text-[#7C3AED] hover:text-[#6D28D9] font-semibold text-sm"
        >
          <ArrowLeft size={16} />
          Back to Invoices
        </a>
      </main>
    )
  }

  const items = invoice.invoice_items || []
  const isVoided = invoice.status === 'voided'

  return (
    <>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Top bar (hidden in print) ── */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <a
            href="#/invoices"
            className="inline-flex items-center gap-1.5 text-[#7C3AED] hover:text-[#6D28D9] font-medium text-sm transition-colors"
          >
            <ArrowLeft size={18} />
            Back to Invoices
          </a>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#7C3AED] hover:bg-[#EDE9FE] border border-[#EDE9FE] rounded-lg transition-colors"
            >
              <Printer size={16} />
              Print
            </button>
            {!isVoided && (
              <button
                onClick={() => setVoidModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
              >
                <XCircle size={16} />
                Void Invoice
              </button>
            )}
          </div>
        </div>

        {/* ── Invoice card ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#EDE9FE] overflow-hidden relative print:shadow-none print:border-gray-200 print:rounded-none">
          {/* Voided watermark */}
          {isVoided && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <span className="text-red-500/10 text-[120px] font-extrabold uppercase tracking-widest -rotate-30 select-none">
                Voided
              </span>
            </div>
          )}

          <div className="relative z-20 p-6 sm:p-8">
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
              </div>
            </div>

            {/* Customer + Status row */}
            <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mb-8">
              <div>
                {(invoice.customer_name || invoice.customer_contact) && (
                  <>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Bill To</p>
                    {invoice.customer_name && (
                      <p className="text-sm font-semibold text-gray-800">{invoice.customer_name}</p>
                    )}
                    {invoice.customer_contact && (
                      <p className="text-sm text-gray-500">{invoice.customer_contact}</p>
                    )}
                  </>
                )}
              </div>
              <div className="flex flex-col items-start sm:items-end gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-400 uppercase">Status</span>
                  {isVoided ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                      Voided
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                      Active
                    </span>
                  )}
                </div>
                {invoice.payment_method && (
                  <p className="text-sm text-gray-500">
                    <span className="text-xs font-medium text-gray-400 uppercase mr-1">Payment</span>
                    {invoice.payment_method}
                  </p>
                )}
                {invoice.shipping_option && (
                  <p className="text-sm text-gray-500">
                    <span className="text-xs font-medium text-gray-400 uppercase mr-1">Shipping</span>
                    {invoice.shipping_option}
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
                        {item.product_category && (
                          <p className="text-xs text-gray-400">{item.product_category}</p>
                        )}
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
                    <span className="text-gray-500">
                      Discount
                      {invoice.discount_type === 'percent' ? ' (%)' : ''}
                    </span>
                    <span className="font-medium text-red-500">-{formatCurrency(invoice.discount)}</span>
                  </div>
                )}
                <div className="border-t border-[#EDE9FE] print:border-gray-200 pt-2 flex justify-between">
                  <span className="font-semibold text-[#7C3AED] print:text-gray-900">Total</span>
                  <span className="text-xl font-bold text-[#7C3AED] print:text-gray-900">{formatCurrency(invoice.total)}</span>
                </div>
              </div>
            </div>

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

      {/* Void confirmation modal */}
      {voidModalOpen && (
        <VoidModal
          voiding={voiding}
          onConfirm={handleVoid}
          onClose={() => setVoidModalOpen(false)}
        />
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
