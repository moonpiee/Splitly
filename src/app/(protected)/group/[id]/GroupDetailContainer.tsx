'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/utils/supabase/client'
import { normalizeUserId, formatUserId } from '@/utils/auth-map'
import { 
  Users, UserPlus, Receipt, ArrowRightLeft, PlusCircle, 
  Trash2, FileText, CheckCircle, Copy, Check, Loader2, ArrowRight
} from 'lucide-react'

interface GroupDetailContainerProps {
  group: any
  members: any[]
  expenses: any[]
  settlements: any[]
  netBalances: Record<string, number>
  simplifiedDebts: any[]
  currentUserId: string
}

export default function GroupDetailContainer({
  group,
  members,
  expenses,
  settlements,
  netBalances,
  simplifiedDebts,
  currentUserId,
}: GroupDetailContainerProps) {
  const router = useRouter()
  const supabase = createClient()

  // General States
  const [copiedId, setCopiedId] = useState(false)
  
  // Add Member State
  const [newMemberId, setNewMemberId] = useState('')
  const [memberLoading, setMemberLoading] = useState(false)
  const [memberError, setMemberError] = useState<string | null>(null)
  const [memberSuccess, setMemberSuccess] = useState(false)

  // Settle Up State
  const [settleLoading, setSettleLoading] = useState<string | null>(null) // ID of debt being settled

  // Delete Expense State
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

  const handleCopyGroupId = () => {
    navigator.clipboard.writeText(group.id)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  // Add Member to Group
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setMemberError(null)
    setMemberSuccess(false)
    
    const normalizedId = normalizeUserId(newMemberId)
    if (!normalizedId) return

    setMemberLoading(true)

    try {
      // 1. Find profile by unique_user_id
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('id, display_name')
        .eq('unique_user_id', normalizedId)
        .maybeSingle()

      if (profileErr || !profile) {
        setMemberError(`User @${normalizedId} not found. Make sure they have signed up first!`)
        setMemberLoading(false)
        return
      }

      // 2. Check if already a member
      const isAlreadyMember = members.some((m) => m.id === profile.id)
      if (isAlreadyMember) {
        setMemberError(`${profile.display_name} is already a member of this group.`)
        setMemberLoading(false)
        return
      }

      // 3. Add member
      const { error: insertErr } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          profile_id: profile.id,
        })

      if (insertErr) throw insertErr

      setMemberSuccess(true)
      setNewMemberId('')
      router.refresh()
    } catch (err: any) {
      setMemberError(err.message || 'Could not add member.')
    } finally {
      setMemberLoading(false)
    }
  }

  // Settle a simplified debt
  const handleSettleUp = async (fromId: string, toId: string, amount: number) => {
    const settleId = `${fromId}-${toId}`
    setSettleLoading(settleId)

    try {
      const { error } = await supabase
        .from('settlements')
        .insert({
          group_id: group.id,
          payer_id: fromId,
          payee_id: toId,
          amount: amount,
        })

      if (error) throw error
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Error recording settlement.')
    } finally {
      setSettleLoading(null)
    }
  }

  // Delete an expense
  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return

    setDeleteLoading(expenseId)

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)

      if (error) throw error
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Error deleting expense.')
    } finally {
      setDeleteLoading(null)
    }
  }

  // Securely download receipt using signed URL
  const handleViewReceipt = async (receiptUrl: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('receipts')
        .createSignedUrl(receiptUrl, 120) // 120 seconds valid

      if (error || !data?.signedUrl) {
        throw error || new Error('Could not generate download URL')
      }

      window.open(data.signedUrl, '_blank')
    } catch (err: any) {
      alert(`Could not view receipt: ${err.message || err}`)
    }
  }

  const getProfileName = (id: string) => {
    return members.find((m) => m.id === id)?.display_name || 'Someone'
  }

  const getProfileUsername = (id: string) => {
    const raw = members.find((m) => m.id === id)?.unique_user_id
    return raw ? formatUserId(raw) : ''
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header Info */}
      <section className="glass-panel p-6 flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white">{group.name}</h1>
          </div>
          <p className="text-text-muted text-sm mt-1">{group.description || 'No description provided.'}</p>
          
          <div className="flex items-center gap-2 mt-3 text-xs text-text-muted">
            <span className="font-semibold">Group ID:</span>
            <span className="font-mono bg-white/5 px-2 py-0.5 rounded border border-stroke text-white">{group.id}</span>
            <button
              onClick={handleCopyGroupId}
              className="p-1 rounded bg-white/5 hover:bg-white/10 text-text-muted hover:text-white cursor-pointer"
              title="Copy Group ID"
            >
              {copiedId ? <Check className="w-3.5 h-3.5 text-accent-green" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
        
        <Link
          href={`/expense/new?groupId=${group.id}`}
          className="custom-btn flex items-center justify-center gap-2 py-3 px-5 text-sm shrink-0 w-full sm:w-auto"
        >
          <PlusCircle className="w-4.5 h-4.5" />
          <span>Add Expense</span>
        </Link>
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-6">
        
        {/* Left Column: Expenses list */}
        <div className="flex flex-col gap-6">
          {/* Section: Simplified Debts (Settle up) */}
          <div className="glass-panel p-6">
            <h3 className="font-bold text-base text-text-main flex items-center gap-2 mb-4">
              <ArrowRightLeft className="w-4 h-4 text-accent-purple" />
              <span>Simplified Balances</span>
            </h3>

            {simplifiedDebts.length === 0 ? (
              <div className="text-sm text-text-muted bg-white/[0.01] border border-stroke/30 rounded-2xl p-4 flex items-center gap-2.5">
                <CheckCircle className="w-5 h-5 text-accent-green shrink-0" />
                <span>Everyone is settled up in this group! No outstanding debts.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {simplifiedDebts.map((debt, index) => {
                  const isPayerCurrentUser = debt.from === currentUserId
                  const isPayeeCurrentUser = debt.to === currentUserId
                  const debtId = `${debt.from}-${debt.to}`
                  const loadingSettle = settleLoading === debtId

                  return (
                    <div
                      key={index}
                      className="flex justify-between items-center gap-4 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.03] transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`font-semibold truncate ${isPayerCurrentUser ? 'text-white' : 'text-text-muted'}`}>
                          {isPayerCurrentUser ? 'You' : getProfileName(debt.from)}
                        </span>
                        <ArrowRight className="w-4 h-4 text-text-muted/60 shrink-0" />
                        <span className={`font-semibold truncate ${isPayeeCurrentUser ? 'text-white' : 'text-text-muted'}`}>
                          {isPayeeCurrentUser ? 'You' : getProfileName(debt.to)}
                        </span>
                        <span className="text-text-muted text-sm shrink-0 ml-1.5">
                          owes <strong className="text-white">₹{debt.amount.toLocaleString()}</strong>
                        </span>
                      </div>

                      <button
                        onClick={() => handleSettleUp(debt.from, debt.to, debt.amount)}
                        disabled={loadingSettle}
                        className="custom-btn custom-btn-secondary py-1.5 px-3 text-xs flex items-center gap-1 cursor-pointer shrink-0 font-semibold text-accent-green border-accent-green/20 hover:bg-accent-green/5"
                      >
                        {loadingSettle ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-green" />
                        ) : (
                          <span>Settle up</span>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Section: Expense History */}
          <div className="glass-panel p-6">
            <h3 className="font-bold text-base text-text-main flex items-center gap-2 mb-4">
              <Receipt className="w-4.5 h-4.5 text-accent-purple" />
              <span>Expense History</span>
            </h3>

            {expenses.length === 0 ? (
              <div className="text-center py-10 text-text-muted text-sm">
                No expenses logged yet. Add one to split!
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {expenses.map((expense) => {
                  const payerName = getProfileName(expense.paid_by)
                  const isPayerMe = expense.paid_by === currentUserId
                  const date = new Date(expense.expense_date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })
                  const mySplit = expense.splits.find((s: any) => s.profile_id === currentUserId)
                  const mySplitAmount = mySplit ? mySplit.amount : 0

                  let statusText = ''
                  let statusClass = 'text-text-muted'

                  if (isPayerMe) {
                    const othersOweMe = expense.amount - mySplitAmount
                    statusText = othersOweMe > 0 ? `You lent ₹${othersOweMe.toLocaleString()}` : 'You lent ₹0'
                    statusClass = 'text-accent-green font-semibold'
                  } else if (mySplitAmount > 0) {
                    statusText = `You owe ₹${mySplitAmount.toLocaleString()}`
                    statusClass = 'text-danger font-semibold'
                  } else {
                    statusText = 'Not involved'
                  }

                  return (
                    <div
                      key={expense.id}
                      className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:border-stroke/50 transition-all"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center text-accent-purple shrink-0 mt-0.5">
                          <Receipt className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-text-main text-sm leading-snug truncate">
                            {expense.description}
                          </h4>
                          <p className="text-xs text-text-muted mt-0.5">
                            {isPayerMe ? 'You' : payerName} paid <strong className="text-white">₹{expense.amount.toLocaleString()}</strong> • {expense.splits.length} members
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className="text-[10px] text-text-muted/50 bg-white/5 border border-stroke px-2 py-0.5 rounded">
                              {date}
                            </span>
                            <span className="text-[10px] text-text-muted/50 bg-white/5 border border-stroke px-2 py-0.5 rounded capitalize">
                              Split: {expense.split_type}
                            </span>
                            {expense.receipt_url && (
                              <button
                                onClick={() => handleViewReceipt(expense.receipt_url)}
                                className="text-[10px] font-semibold text-accent-purple hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <FileText className="w-3 h-3" />
                                <span>Receipt</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-0 border-stroke/30 pt-3 sm:pt-0 shrink-0">
                        <div className="text-right">
                          <div className={`text-sm ${statusClass}`}>{statusText}</div>
                        </div>

                        {/* Allow deletion by anyone in the group for simplified team play, or add restrict rules if desired */}
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          disabled={deleteLoading === expense.id}
                          className="p-2 rounded-xl bg-white/5 hover:bg-red-500/10 text-text-muted hover:text-danger cursor-pointer transition-colors"
                          title="Delete Expense"
                        >
                          {deleteLoading === expense.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-danger" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Sidebar Panels (Members, Add Member) */}
        <div className="flex flex-col gap-6">
          
          {/* Section: Add Member */}
          <div className="glass-panel p-6">
            <h3 className="font-bold text-base text-text-main flex items-center gap-2 mb-2">
              <UserPlus className="w-4.5 h-4.5 text-accent-purple" />
              <span>Invite Member</span>
            </h3>
            <p className="text-xs text-text-muted mb-4">Add a user instantly to this group by typing their public user ID.</p>

            <form onSubmit={handleAddMember} className="flex flex-col gap-3">
              {memberError && <div className="text-xs text-danger">{memberError}</div>}
              {memberSuccess && <div className="text-xs text-accent-green font-semibold">Member added successfully!</div>}

              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-text-muted/60 font-mono text-sm">@</span>
                <input
                  required
                  placeholder="username"
                  className="custom-input py-2 pl-8 text-sm font-mono"
                  value={newMemberId}
                  onChange={(e) => setNewMemberId(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={memberLoading}
                className="custom-btn py-2 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {memberLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Add Member</span>
              </button>
            </form>
          </div>

          {/* Section: Group Members */}
          <div className="glass-panel p-6">
            <h3 className="font-bold text-base text-text-main flex items-center gap-2 mb-4">
              <Users className="w-4.5 h-4.5 text-accent-purple" />
              <span>Members ({members.length})</span>
            </h3>

            <div className="flex flex-col gap-3.5">
              {members.map((member) => {
                const bal = netBalances[member.id] || 0
                const isCurrentUser = member.id === currentUserId
                
                let balText = 'Settled'
                let balClass = 'text-text-muted'

                if (bal > 0.01) {
                  balText = `Owed ₹${bal.toLocaleString()}`
                  balClass = 'text-accent-green'
                } else if (bal < -0.01) {
                  balText = `Owes ₹${Math.abs(bal).toLocaleString()}`
                  balClass = 'text-danger'
                }

                return (
                  <div key={member.id} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <div className="font-semibold text-text-main truncate flex items-center gap-1.5">
                        <span>{member.display_name}</span>
                        {isCurrentUser && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white border border-stroke">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-text-muted/60 font-mono mt-0.5">
                        {formatUserId(member.unique_user_id)}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-xs font-semibold ${balClass}`}>{balText}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
