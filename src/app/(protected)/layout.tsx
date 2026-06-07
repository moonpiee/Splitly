import { createClient } from '@/utils/supabase/server'
import { formatUserId } from '@/utils/auth-map'
import SideNav from './SideNav'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    profile = data
  }

  const uniqueId = profile?.unique_user_id ? formatUserId(profile.unique_user_id) : '@user'

  return (
    <div className="min-h-screen pb-12">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 pt-6">
        {/* Topbar */}
        <header className="flex justify-between items-center gap-4 mb-8">
          <div className="flex items-center gap-3 font-bold text-lg tracking-wide text-text-main">
            <div className="logo w-10 h-10 rounded-xl bg-gradient-to-br from-accent-purple to-accent-green shadow-custom"></div>
            <div>
              <div className="leading-tight text-[18px]">Splitly</div>
              <div className="text-text-muted text-[12px] font-normal">Simple expense splitting</div>
            </div>
          </div>
          
          <div className="pill px-4 py-2 border border-stroke bg-card-bg backdrop-blur-md rounded-full text-text-muted text-[13px] font-semibold flex items-center gap-2">
            <span>Your ID:</span>
            <strong className="text-white font-mono">{uniqueId}</strong>
          </div>
        </header>

        {/* Main Layout */}
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 items-start">
          {/* Sidebar Nav */}
          <aside className="glass-panel p-5 md:sticky md:top-6 h-fit flex flex-col gap-6">
            <div>
              <div className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-accent-purple/10 text-purple-300 border border-accent-purple/20 mb-4">
                Navigation
              </div>
              
              <SideNav />
            </div>
          </aside>

          {/* Content Area */}
          <main className="flex flex-col gap-6 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
