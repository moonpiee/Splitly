import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getSimplifiedTransactions } from '@/utils/balance-simplifier'
import GroupDetailContainer from './GroupDetailContainer'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function GroupDetailPage({ params }: PageProps) {
  const { id: groupId } = await params

  const supabase = await createClient()

  // 1. Fetch current user session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. Fetch Group details
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .maybeSingle()

  if (groupError || !group) {
    notFound()
  }

  // 3. Verify membership to prevent access
  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('profile_id', user.id)
    .maybeSingle()

  if (!membership) {
    // Return unauthorized access view or redirect
    return (
      <div className="glass-panel p-8 text-center max-w-md mx-auto mt-12">
        <h2 className="text-xl font-bold text-danger">Access Denied</h2>
        <p className="text-sm text-text-muted mt-2">
          You are not a member of this group, or you do not have permission to view it.
        </p>
      </div>
    )
  }

  // 4. Fetch group members profiles
  const { data: membersData } = await supabase
    .from('group_members')
    .select('profiles(id, unique_user_id, display_name, avatar_url)')
    .eq('group_id', groupId)

  const membersList = membersData
    ?.map((m: any) => m.profiles)
    .filter(Boolean) || []

  // 5. Fetch expenses with splits
  const { data: expensesData } = await supabase
    .from('expenses')
    .select('*, expense_splits(profile_id, amount, percent)')
    .eq('group_id', groupId)
    .order('expense_date', { ascending: false })

  const expensesList = (expensesData || []).map((e: any) => ({
    id: e.id,
    paid_by: e.paid_by,
    amount: Number(e.amount),
    description: e.description,
    split_type: e.split_type,
    receipt_url: e.receipt_url,
    expense_date: e.expense_date,
    splits: (e.expense_splits || []).map((s: any) => ({
      profile_id: s.profile_id,
      amount: Number(s.amount),
      percent: s.percent ? Number(s.percent) : undefined,
    })),
  }))

  // 6. Fetch settlements
  const { data: settlementsData } = await supabase
    .from('settlements')
    .select('*')
    .eq('group_id', groupId)
    .order('settled_at', { ascending: false })

  const settlementsList = (settlementsData || []).map((s: any) => ({
    id: s.id,
    group_id: s.group_id,
    payer_id: s.payer_id,
    payee_id: s.payee_id,
    amount: Number(s.amount),
    settled_at: s.settled_at,
  }))

  // 7. Calculate simplified debts
  const { netBalances, transactions: simplifiedDebts } = getSimplifiedTransactions(
    membersList,
    expensesList,
    settlementsList
  )

  return (
    <GroupDetailContainer
      group={group}
      members={membersList}
      expenses={expensesList}
      settlements={settlementsList}
      netBalances={netBalances}
      simplifiedDebts={simplifiedDebts}
      currentUserId={user.id}
    />
  )
}
