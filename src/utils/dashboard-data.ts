import { getSimplifiedTransactions, Profile, Expense, Settlement, SimplifiedDebt } from './balance-simplifier'

export interface GroupData {
  id: string
  name: string
  description: string | null
  members: Profile[]
  expenses: Expense[]
  settlements: Settlement[]
  netBalances: Record<string, number>
  simplifiedDebts: SimplifiedDebt[]
}

export interface ActivityItem {
  id: string
  type: 'expense' | 'settlement'
  title: string
  description: string
  amount: number
  date: string
  groupName: string
  groupId: string
  rawDelta: number // Positive if current user is owed, negative if current user owes, or settled
}

export async function fetchDashboardData(supabase: any, userId: string) {
  // 1. Fetch groups that the user is part of
  const { data: memberGroups, error: groupsError } = await supabase
    .from('group_members')
    .select('group_id, groups(id, name, description, created_by)')
    .eq('profile_id', userId)

  if (groupsError || !memberGroups || memberGroups.length === 0) {
    return {
      groups: [],
      totalOwedToYou: 0,
      totalYouOwe: 0,
      netBalance: 0,
      recentActivity: [],
    }
  }

  const groupIds = memberGroups.map((mg: any) => mg.group_id)
  const groupsList = memberGroups.map((mg: any) => mg.groups)

  // 2. Fetch all members of these groups
  const { data: membersData } = await supabase
    .from('group_members')
    .select('group_id, profiles(id, unique_user_id, display_name, avatar_url)')
    .in('group_id', groupIds)

  // 3. Fetch all expenses with splits
  const { data: expensesData } = await supabase
    .from('expenses')
    .select('*, expense_splits(profile_id, amount)')
    .in('group_id', groupIds)
    .order('expense_date', { ascending: false })

  // 4. Fetch all settlements
  const { data: settlementsData } = await supabase
    .from('settlements')
    .select('*')
    .in('group_id', groupIds)
    .order('settled_at', { ascending: false })

  // 5. Group the data by group_id
  const groupsDataMap: Record<string, GroupData> = {}

  groupsList.forEach((group: any) => {
    if (!group) return
    groupsDataMap[group.id] = {
      id: group.id,
      name: group.name,
      description: group.description,
      members: [],
      expenses: [],
      settlements: [],
      netBalances: {},
      simplifiedDebts: [],
    }
  })

  // Map members
  membersData?.forEach((m: any) => {
    if (m.profiles && groupsDataMap[m.group_id]) {
      groupsDataMap[m.group_id].members.push({
        id: m.profiles.id,
        unique_user_id: m.profiles.unique_user_id,
        display_name: m.profiles.display_name,
        avatar_url: m.profiles.avatar_url || undefined,
      })
    }
  })

  // Map expenses
  expensesData?.forEach((e: any) => {
    if (groupsDataMap[e.group_id]) {
      groupsDataMap[e.group_id].expenses.push({
        id: e.id,
        paid_by: e.paid_by,
        amount: Number(e.amount),
        description: e.description,
        split_type: e.split_type,
        expense_date: e.expense_date,
        splits: (e.expense_splits || []).map((s: any) => ({
          profile_id: s.profile_id,
          amount: Number(s.amount),
        })),
      })
    }
  })

  // Map settlements
  settlementsData?.forEach((s: any) => {
    if (groupsDataMap[s.group_id]) {
      groupsDataMap[s.group_id].settlements.push({
        payer_id: s.payer_id,
        payee_id: s.payee_id,
        amount: Number(s.amount),
      })
    }
  })

  // 6. Calculate statistics and simplify debts per group
  let totalOwedToYou = 0
  let totalYouOwe = 0
  const recentActivity: ActivityItem[] = []

  const processedGroups = Object.values(groupsDataMap).map((group) => {
    const { netBalances, transactions } = getSimplifiedTransactions(
      group.members,
      group.expenses,
      group.settlements
    )

    group.netBalances = netBalances
    group.simplifiedDebts = transactions

    // Sum up debts for the current user in this group
    transactions.forEach((tx) => {
      if (tx.from === userId) {
        totalYouOwe += tx.amount
      } else if (tx.to === userId) {
        totalOwedToYou += tx.amount
      }
    })

    // Create activity items for expenses in this group
    group.expenses.forEach((exp) => {
      const payerName = group.members.find((m) => m.id === exp.paid_by)?.display_name || 'Someone'
      const userSplit = exp.splits.find((s) => s.profile_id === userId)
      const userSplitAmount = userSplit ? userSplit.amount : 0
      
      let rawDelta = 0
      if (exp.paid_by === userId) {
        rawDelta = exp.amount - userSplitAmount
      } else if (userSplitAmount > 0) {
        rawDelta = -userSplitAmount
      }

      recentActivity.push({
        id: exp.id,
        type: 'expense',
        title: exp.description,
        description: exp.paid_by === userId 
          ? `You paid ₹${exp.amount.toLocaleString()}` 
          : `${payerName} paid ₹${exp.amount.toLocaleString()}`,
        amount: exp.amount,
        date: exp.expense_date,
        groupName: group.name,
        groupId: group.id,
        rawDelta,
      })
    })

    // Create activity items for settlements in this group
    group.settlements.forEach((set, index) => {
      const payerName = group.members.find((m) => m.id === set.payer_id)?.display_name || 'Someone'
      const payeeName = group.members.find((m) => m.id === set.payee_id)?.display_name || 'Someone'
      
      let rawDelta = 0
      if (set.payer_id === userId) {
        rawDelta = set.amount // Reducing debt
      } else if (set.payee_id === userId) {
        rawDelta = -set.amount // Reducing credit
      }

      recentActivity.push({
        id: `settle-${index}-${set.payer_id}-${set.payee_id}`,
        type: 'settlement',
        title: 'Settle Up',
        description: set.payer_id === userId
          ? `You paid ${payeeName} ₹${set.amount.toLocaleString()}`
          : set.payee_id === userId
            ? `${payerName} paid you ₹${set.amount.toLocaleString()}`
            : `${payerName} paid ${payeeName} ₹${set.amount.toLocaleString()}`,
        amount: set.amount,
        date: set.settled_at || new Date().toISOString(),
        groupName: group.name,
        groupId: group.id,
        rawDelta,
      })
    })

    return group
  })

  // Sort global recent activity by date descending and take top 10
  recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const topRecentActivity = recentActivity.slice(0, 10)

  return {
    groups: processedGroups,
    totalOwedToYou: Number(totalOwedToYou.toFixed(2)),
    totalYouOwe: Number(totalYouOwe.toFixed(2)),
    netBalance: Number((totalOwedToYou - totalYouOwe).toFixed(2)),
    recentActivity: topRecentActivity,
  }
}
