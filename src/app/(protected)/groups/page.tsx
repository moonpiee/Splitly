import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { fetchDashboardData } from '@/utils/dashboard-data'
import GroupsListContainer from './GroupsListContainer'

export default async function GroupsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // We reuse fetchDashboardData to fetch groups with members, expenses, and simplified balances
  const data = await fetchDashboardData(supabase, user.id)

  return (
    <GroupsListContainer groups={data.groups} currentUserId={user.id} />
  )
}
