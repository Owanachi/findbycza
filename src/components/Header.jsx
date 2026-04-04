import { Plus, LogOut } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'

const LOGO_URL = 'https://iixivpuyrxeoapsouszx.supabase.co/storage/v1/object/public/product-images/Logo.jpg'

export default function Header({ onAdd }) {
  const { user, signOut } = useAuth()

  return (
    <header className="bg-purple-600 sticky top-0 z-30 shadow-lg shadow-purple-600/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <img
              src={LOGO_URL}
              alt="Fabulous Finds by Cza"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-white/30"
            />
            <h1 className="text-xl font-bold text-white">Fabulous Finds by Cza</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onAdd}
              className="inline-flex items-center gap-2 bg-white text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-50 transition-colors font-medium text-sm"
            >
              <Plus size={18} />
              Add Product
            </button>
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
      </div>
    </header>
  )
}
