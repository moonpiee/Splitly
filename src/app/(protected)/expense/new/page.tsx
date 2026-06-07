import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ExpenseForm from '@/components/ExpenseForm'

interface PageProps {
  searchParams: Promise<{ groupId?: string }>
}

export default async function NewExpensePage({ searchParams }: PageProps) {
  const { groupId } = await searchParams

  const supabase = await createClient()

  // 1. Fetch current user session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. Fetch all groups where the user is a member, including group details
  const { data: memberGroups, error: groupsError } = await supabase
    .from('group_members')
    .select('group_id, groups(id, name)')
    .eq('profile_id', user.id)

  if (groupsError || !memberGroups || memberGroups.length === 0) {
    return (
      <div className="glass-panel p-8 text-center max-w-md mx-auto mt-12">
        <h2 className="text-xl font-bold text-danger">No Groups Found</h2>
        <p className="text-sm text-text-muted mt-2">
          You need to be in at least one group to create an expense.
        </p>
      </div>
    )
  }

  const groupIds = memberGroups.map((mg: any) => mg.group_id)
  const groupsList = memberGroups.map((mg: any) => mg.groups).filter(Boolean)

  // 3. Fetch members for all these groups
  const { data: membersData } = await supabase
    .from('group_members')
    .select('group_id, profiles(id, unique_user_id, display_name, avatar_url)')
    .in('group_id', groupIds)

  // 4. Map members to groups
  const groupsWithMembers = groupsList.map((group: any) => {
    const members = membersData
      ?.filter((m: any) => m.group_id === group.id)
      ?.map((m: any) => m.profiles)
      ?.filter(Boolean) || []

    return {
      ...group,
      members,
    }
  })

  return (
    <div className="glass-panel p-6 md:p-8 max-w-2xl mx-auto w-full">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-text-main">Add an Expense</h2>
        <p className="text-text-muted text-sm mt-1">Record a new payment and choose how to split it.</p>
      </div>

      <ExpenseForm 
        groups={groupsWithMembers} 
        currentUserId={user.id} 
        initialGroupId={groupId} 
      />
    </div>
  )
}
