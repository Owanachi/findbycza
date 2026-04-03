import { Package, Plus, LogOut } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'

export default function Header({ onAdd }) {
  const { user, signOut } = useAuth()

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2 rounded-lg">
              <Package size={24} />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Fabulous Finds by Cza</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onAdd}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
            >
              <Plus size={18} />
              Add Product
            </button>
            <div className="hidden sm:block text-sm text-gray-500 border-l border-gray-200 pl-3">
              {user?.email}
            </div>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-1.5 text-gray-500 hover:text-red-600 px-2 py-2 rounded-lg hover:bg-red-50 transition-colors text-sm"
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
