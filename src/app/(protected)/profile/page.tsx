import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ProfileCard from './ProfileCard'

export default async function ProfilePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch groups details
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id, groups(id, name)')
    .eq('profile_id', user.id)

  const groupCount = memberships?.length || 0
  const groupsList = memberships?.map((m: any) => m.groups).filter(Boolean) || []

  return (
    <div className="glass-panel p-6 md:p-8 flex flex-col gap-8 max-w-2xl mx-auto w-full">
      <div>
        <h2 className="text-xl font-bold text-text-main">Your Profile</h2>
        <p className="text-text-muted text-sm mt-1">Manage your public ID and view your account details.</p>
      </div>

      <ProfileCard 
        profile={profile} 
        groupCount={groupCount}
        groups={groupsList}
      />
    </div>
  )
}
