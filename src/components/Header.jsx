import { Plus, LogOut, Package, FileText } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'

const LOGO_URL = 'https://iixivpuyrxeoapsouszx.supabase.co/storage/v1/object/public/product-images/Logo.jpg'

export default function Header({ onAdd, page, onNavigate }) {
  const { user, signOut } = useAuth()

  const navLinkClass = (target) =>
    `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      page === target
        ? 'bg-white/20 text-white'
        : 'text-white/70 hover:text-white hover:bg-white/10'
    }`

  return (
    <header
      className="sticky top-0 z-30 shadow-lg shadow-purple-600/30"
      style={{ background: 'linear-gradient(135deg, #7C3AED, #9F67F7)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <img
              src={LOGO_URL}
              alt="Fabulous Finds by Za"
              className="w-11 h-11 rounded-full object-cover ring-2 ring-white/40 shadow-md"
            />
            <h1 className="text-xl font-bold text-white tracking-tight">Fabulous Finds by Za</h1>
            <nav className="hidden sm:flex items-center gap-1 ml-4 border-l border-white/20 pl-4">
              <button onClick={() => onNavigate('inventory')} className={navLinkClass('inventory')}>
                <Package size={16} />
                Inventory
              </button>
              <button onClick={() => onNavigate('invoices')} className={navLinkClass('invoices')}>
                <FileText size={16} />
                Invoices
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {page === 'inventory' && (
              <button
                onClick={onAdd}
                className="inline-flex items-center gap-2 bg-white text-[#7C3AED] px-4 py-2 rounded-lg hover:bg-purple-50 transition-colors font-semibold text-sm shadow-sm"
              >
                <Plus size={18} />
                Add Product
              </button>
            )}
            <div className="hidden sm:block text-sm text-white/80 border-l border-white/20 pl-3">
              {user?.email}
            </div>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-1.5 text-white/80 hover:text-white px-2 py-2 rounded-lg hover:bg-white/10 transition-colors text-sm"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
        {/* Mobile nav */}
        <div className="flex sm:hidden items-center gap-1 pb-2">
          <button onClick={() => onNavigate('inventory')} className={navLinkClass('inventory')}>
            <Package size={16} />
            Inventory
          </button>
          <button onClick={() => onNavigate('invoices')} className={navLinkClass('invoices')}>
            <FileText size={16} />
            Invoices
          </button>
        </div>
      </div>
    </header>
  )
}
