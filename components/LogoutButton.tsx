'use client'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.refresh()
  }

  return (
    <button onClick={handleLogout} className="btn-secondary text-slate-500 text-sm">
      Logout
    </button>
  )
}