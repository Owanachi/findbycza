import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'

const LOGO_URL = 'https://iixivpuyrxeoapsouszx.supabase.co/storage/v1/object/public/product-images/Logo.jpg'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: err } = await signIn(email, password)
    if (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #7C3AED, #9F67F7)' }}
    >
      <div className="w-full max-w-sm">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-2xl border border-[#EDE9FE] p-8 space-y-5"
        >
          <div className="text-center">
            <img
              src={LOGO_URL}
              alt="Fabulous Finds by Za"
              className="w-24 h-24 rounded-full object-cover mx-auto mb-4 ring-4 ring-[#EDE9FE] shadow-lg"
            />
            <h1 className="text-2xl font-bold text-[#7C3AED]">Fabulous Finds by Za</h1>
            <p className="text-gray-500 mt-1 text-sm">Sign in to manage your inventory</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-[#7C3AED] outline-none"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-[#7C3AED] outline-none"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#7C3AED] text-white py-2.5 rounded-lg hover:bg-[#6D28D9] transition-colors font-semibold text-sm disabled:opacity-50 shadow-md"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
