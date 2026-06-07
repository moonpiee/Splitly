'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { LayoutDashboard, Users, User, PlusCircle, LogOut } from 'lucide-react'

export default function SideNav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Groups', href: '/groups', icon: Users },
    { name: 'Profile', href: '/profile', icon: User },
  ]

  return (
    <div className="flex flex-col gap-2">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`navitem flex items-center justify-between px-4 py-3 rounded-2xl text-text-main transition-all duration-200 bg-white/[0.03] border ${
              isActive 
                ? 'border-stroke bg-white/[0.08] shadow-sm font-semibold' 
                : 'border-transparent hover:bg-white/[0.06]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon className={`w-4 h-4 ${isActive ? 'text-accent-green' : 'text-text-muted'}`} />
              <span className="text-sm">{item.name}</span>
            </div>
            <span className="text-text-muted text-xs">›</span>
          </Link>
        )
      })}
      
      <div className="h-px bg-stroke my-3"></div>

      <Link
        href="/expense/new"
        className="custom-btn w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm"
      >
        <PlusCircle className="w-4 h-4" />
        <span>Add Expense</span>
      </Link>

      <button
        onClick={handleSignOut}
        className="flex items-center gap-3 px-4 py-3 rounded-2xl text-danger hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all text-sm mt-2 text-left cursor-pointer"
      >
        <LogOut className="w-4 h-4" />
        <span>Sign Out</span>
      </button>
    </div>
  )
}
