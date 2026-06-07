export interface Profile {
  id: string
  unique_user_id: string
  display_name: string
  avatar_url?: string
}

export interface Split {
  profile_id: string
  amount: number
}

export interface Expense {
  id: string
  paid_by: string
  amount: number
  description: string
  split_type: string
  expense_date: string
  splits: Split[]
}

export interface Settlement {
  payer_id: string
  payee_id: string
  amount: number
  settled_at?: string
}

export interface SimplifiedDebt {
  from: string
  to: string
  amount: number
}

/**
 * Calculates raw net balances for a list of members given expenses and settlements,
 * then runs a greedy matching algorithm to find the minimal transaction set to resolve all balances.
 */
export function getSimplifiedTransactions(
  members: Profile[],
  expenses: Expense[],
  settlements: Settlement[]
): {
  netBalances: Record<string, number>
  transactions: SimplifiedDebt[]
} {
  const netBalances: Record<string, number> = {}

  // Initialize balances for all group members to 0
  members.forEach((m) => {
    netBalances[m.id] = 0
  })

  // 1. Process Expenses & Splits
  expenses.forEach((expense) => {
    const paidBy = expense.paid_by
    const amount = Number(expense.amount)

    // Add paid amount to payer's net balance
    if (netBalances[paidBy] !== undefined) {
      netBalances[paidBy] += amount
    }

    // Subtract split amounts from each member
    expense.splits?.forEach((split) => {
      const splitProfileId = split.profile_id
      const splitAmount = Number(split.amount)
      if (netBalances[splitProfileId] !== undefined) {
        netBalances[splitProfileId] -= splitAmount
      }
    })
  })

  // 2. Process Settlements
  settlements.forEach((settlement) => {
    const payer = settlement.payer_id
    const payee = settlement.payee_id
    const amount = Number(settlement.amount)

    // Payer's net balance increases (towards 0, meaning they owe less)
    if (netBalances[payer] !== undefined) {
      netBalances[payer] += amount
    }
    // Payee's net balance decreases (meaning they got paid)
    if (netBalances[payee] !== undefined) {
      netBalances[payee] -= amount
    }
  })

  // 3. Simplify Debts using Greedy Matching
  const debtors: { id: string; balance: number }[] = []
  const creditors: { id: string; balance: number }[] = []

  Object.entries(netBalances).forEach(([memberId, balance]) => {
    // Avoid floating point errors
    const rounded = Number(balance.toFixed(2))
    if (rounded < -0.01) {
      debtors.push({ id: memberId, balance: rounded })
    } else if (rounded > 0.01) {
      creditors.push({ id: memberId, balance: rounded })
    }
  })

  // Sort debtors ascending (largest debt first, e.g. -50 before -10)
  debtors.sort((a, b) => a.balance - b.balance)
  // Sort creditors descending (largest credit first, e.g. 50 before 10)
  creditors.sort((a, b) => b.balance - a.balance)

  const transactions: SimplifiedDebt[] = []

  let debtorIndex = 0
  let creditorIndex = 0

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex]
    const creditor = creditors[creditorIndex]

    const debtAmount = -debtor.balance
    const creditAmount = creditor.balance

    const settleAmount = Math.min(debtAmount, creditAmount)
    if (settleAmount > 0.01) {
      transactions.push({
        from: debtor.id,
        to: creditor.id,
        amount: Number(settleAmount.toFixed(2)),
      })
    }

    debtor.balance += settleAmount
    creditor.balance -= settleAmount

    if (Math.abs(debtor.balance) < 0.01) {
      debtorIndex++
    }
    if (Math.abs(creditor.balance) < 0.01) {
      creditorIndex++
    }
  }

  // Format final net balances cleanly
  const formattedBalances: Record<string, number> = {}
  Object.entries(netBalances).forEach(([id, val]) => {
    formattedBalances[id] = Number(val.toFixed(2))
  })

  return {
    netBalances: formattedBalances,
    transactions,
  }
}
