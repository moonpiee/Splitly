'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { formatUserId } from '@/utils/auth-map'
import { Loader2, FileText, X, AlertCircle } from 'lucide-react'

interface Member {
  id: string
  unique_user_id: string
  display_name: string
  avatar_url?: string
}

interface Group {
  id: string
  name: string
  members: Member[]
}

interface ExpenseFormProps {
  groups: Group[]
  currentUserId: string
  initialGroupId?: string
}

export default function ExpenseForm({
  groups,
  currentUserId,
  initialGroupId,
}: ExpenseFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Find initial group if provided in URL params
  const defaultGroup = groups.find((g) => g.id === initialGroupId) || groups[0]

  // Form States
  const [selectedGroupId, setSelectedGroupId] = useState(defaultGroup?.id || '')
  const [description, setDescription] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [paidBy, setPaidBy] = useState(currentUserId)
  const [splitType, setSplitType] = useState<'equal' | 'exact' | 'percentage'>('equal')

  // Split details mapping (memberId -> value)
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({})
  const [percentages, setPercentages] = useState<Record<string, string>>({})

  // File Upload State
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  
  // UX States
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Selected Group Details
  const selectedGroup = groups.find((g) => g.id === selectedGroupId)
  const members = selectedGroup?.members || []

  // Initialize Split Input States when Group or Split Type changes
  useEffect(() => {
    if (members.length > 0) {
      const initialAmounts: Record<string, string> = {}
      const initialPercentages: Record<string, string> = {}
      
      const equalShare = members.length > 0 ? (100 / members.length).toFixed(2) : '0'

      members.forEach((m) => {
        initialAmounts[m.id] = ''
        initialPercentages[m.id] = equalShare
      })

      setExactAmounts(initialAmounts)
      setPercentages(initialPercentages)
    }
  }, [selectedGroupId, members.length])

  // Split calculations
  const totalAmount = parseFloat(amountStr) || 0

  const getSplitBreakdown = () => {
    const breakdown: Record<string, number> = {}

    if (splitType === 'equal') {
      if (members.length === 0) return breakdown
      // Divide equally
      const share = totalAmount / members.length
      const roundedShare = Number(share.toFixed(2))
      
      members.forEach((m) => {
        breakdown[m.id] = roundedShare
      })

      // Adjust for rounding errors on the last member
      const sum = Object.values(breakdown).reduce((acc, val) => acc + val, 0)
      const diff = totalAmount - sum
      if (Math.abs(diff) > 0 && members.length > 0) {
        breakdown[members[members.length - 1].id] = Number((breakdown[members[members.length - 1].id] + diff).toFixed(2))
      }
    } else if (splitType === 'exact') {
      members.forEach((m) => {
        breakdown[m.id] = parseFloat(exactAmounts[m.id]) || 0
      })
    } else if (splitType === 'percentage') {
      members.forEach((m) => {
        const pct = parseFloat(percentages[m.id]) || 0
        breakdown[m.id] = Number((totalAmount * (pct / 100)).toFixed(2))
      })
    }

    return breakdown
  }

  const calculatedSplits = getSplitBreakdown()
  const calculatedSum = Object.values(calculatedSplits).reduce((acc, val) => acc + val, 0)

  // Validate inputs
  const validateForm = () => {
    if (totalAmount <= 0) {
      return 'Please enter a valid amount greater than 0.'
    }
    if (!description.trim()) {
      return 'Please enter an expense description.'
    }

    if (splitType === 'exact') {
      const exactSum = Object.values(exactAmounts).reduce((acc, val) => acc + (parseFloat(val) || 0), 0)
      if (Math.abs(exactSum - totalAmount) > 0.02) {
        return `Exact split sum (₹${exactSum.toFixed(2)}) must equal total amount (₹${totalAmount.toFixed(2)}). Diff: ₹${(totalAmount - exactSum).toFixed(2)}`
      }
    }

    if (splitType === 'percentage') {
      const pctSum = Object.values(percentages).reduce((acc, val) => acc + (parseFloat(val) || 0), 0)
      if (Math.abs(pctSum - 100) > 0.1) {
        return `Percentage splits must sum to 100% (Current sum: ${pctSum.toFixed(1)}%).`
      }
    }

    return null
  }

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate type
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        setError('Only JPG, PNG, and PDF receipt files are supported.')
        return
      }
      // Limit to 5MB
      if (file.size > 5 * 1024 * 1024) {
        setError('Receipt file size must be less than 5MB.')
        return
      }
      setError(null)
      setReceiptFile(file)
    }
  }

  const handleRemoveFile = () => {
    setReceiptFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    try {
      let receiptUrl: string | null = null

      // 1. Upload receipt if attached
      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop()
        const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`
        const storagePath = `${selectedGroupId}/${uniqueFileName}`

        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(storagePath, receiptFile)

        if (uploadError) throw uploadError
        receiptUrl = storagePath
      }

      // 2. Insert expense
      const { data: newExpense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          group_id: selectedGroupId,
          paid_by: paidBy,
          description: description.trim(),
          amount: totalAmount,
          split_type: splitType,
          receipt_url: receiptUrl,
          expense_date: new Date().toISOString(),
        })
        .select()
        .single()

      if (expenseError) throw expenseError

      // 3. Insert splits
      const splitsToInsert = members.map((member) => ({
        expense_id: newExpense.id,
        profile_id: member.id,
        amount: calculatedSplits[member.id],
        percent: splitType === 'percentage' ? parseFloat(percentages[member.id]) || 0 : null,
      }))

      const { error: splitsError } = await supabase
        .from('expense_splits')
        .insert(splitsToInsert)

      if (splitsError) throw splitsError

      router.refresh()
      router.push(`/group/${selectedGroupId}`)
    } catch (err: any) {
      setError(err.message || 'Could not save expense.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Select Group */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] text-text-muted font-medium ml-1">Choose Group</label>
        <select
          value={selectedGroupId}
          onChange={(e) => setSelectedGroupId(e.target.value)}
          className="custom-input cursor-pointer"
        >
          {groups.map((group) => (
            <option key={group.id} value={group.id} className="bg-slate-900 text-white">
              {group.name} ({group.members.length} members)
            </option>
          ))}
        </select>
      </div>

      {/* Title & Amount Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] text-text-muted font-medium ml-1">Expense Title</label>
          <input
            required
            type="text"
            placeholder="e.g. Electricity bill"
            className="custom-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] text-text-muted font-medium ml-1">Amount (₹)</label>
          <input
            required
            type="number"
            step="0.01"
            placeholder="0.00"
            className="custom-input"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
          />
        </div>
      </div>

      {/* Paid By Selection */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] text-text-muted font-medium ml-1">Paid By</label>
        <select
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
          className="custom-input cursor-pointer"
        >
          {members.map((m) => (
            <option key={m.id} value={m.id} className="bg-slate-900 text-white">
              {m.id === currentUserId ? 'You' : m.display_name} ({formatUserId(m.unique_user_id)})
            </option>
          ))}
        </select>
      </div>

      {/* Split Method Tabs */}
      <div className="flex flex-col gap-2">
        <label className="text-[13px] text-text-muted font-medium ml-1">Split Method</label>
        <div className="grid grid-cols-3 gap-2 bg-white/5 border border-stroke p-1.5 rounded-2xl">
          {(['equal', 'exact', 'percentage'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSplitType(type)}
              className={`py-2 text-xs rounded-xl font-bold transition-all cursor-pointer capitalize ${
                splitType === type
                  ? 'bg-white/10 text-white shadow-sm border border-stroke'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Member Split Inputs */}
      <div className="glass-panel p-5 flex flex-col gap-4">
        <h4 className="font-bold text-sm text-text-main">Split Breakdown</h4>
        <div className="flex flex-col gap-3.5">
          {members.map((member) => {
            const splitVal = calculatedSplits[member.id] || 0
            const displayAmount = `₹${splitVal.toLocaleString('en-IN')}`

            return (
              <div key={member.id} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-text-main truncate">
                    {member.id === currentUserId ? 'You' : member.display_name}
                  </div>
                  <div className="text-[11px] text-text-muted/60 font-mono mt-0.5">
                    {formatUserId(member.unique_user_id)}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Mode input boxes */}
                  {splitType === 'exact' && (
                    <div className="relative w-28">
                      <span className="absolute left-3.5 top-2.5 text-text-muted/60 text-xs">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="custom-input py-1.5 pl-7 text-xs"
                        value={exactAmounts[member.id] || ''}
                        onChange={(e) => {
                          const val = e.target.value
                          setExactAmounts((prev) => ({ ...prev, [member.id]: val }))
                        }}
                      />
                    </div>
                  )}

                  {splitType === 'percentage' && (
                    <div className="relative w-24">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="0"
                        className="custom-input py-1.5 pr-7 text-xs text-right"
                        value={percentages[member.id] || ''}
                        onChange={(e) => {
                          const val = e.target.value
                          setPercentages((prev) => ({ ...prev, [member.id]: val }))
                        }}
                      />
                      <span className="absolute right-3.5 top-2.5 text-text-muted/60 text-xs">%</span>
                    </div>
                  )}

                  {/* Calculated Display share */}
                  <span className="text-sm font-semibold text-white w-20 text-right">
                    {displayAmount}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Totals validator footer row */}
        {(splitType === 'exact' || splitType === 'percentage') && (
          <div className="border-t border-stroke/50 pt-3 mt-1 flex justify-between items-center text-xs">
            <span className="text-text-muted">
              {splitType === 'exact'
                ? `Total Allocated: ₹${calculatedSum.toFixed(2)}`
                : `Total Allocated Percent: ${Object.values(percentages).reduce((a, b) => a + (parseFloat(b) || 0), 0).toFixed(1)}%`}
            </span>
            <span
              className={`font-semibold ${
                splitType === 'exact'
                  ? Math.abs(calculatedSum - totalAmount) < 0.02
                    ? 'text-accent-green'
                    : 'text-danger'
                  : Math.abs(Object.values(percentages).reduce((a, b) => a + (parseFloat(b) || 0), 0) - 100) < 0.1
                    ? 'text-accent-green'
                    : 'text-danger'
              }`}
            >
              {splitType === 'exact'
                ? `Target: ₹${totalAmount.toFixed(2)}`
                : 'Target: 100%'}
            </span>
          </div>
        )}
      </div>

      {/* Receipt Uploader */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] text-text-muted font-medium ml-1">Receipt Attachment (Optional)</label>
        
        {receiptFile ? (
          <div className="flex items-center justify-between gap-3 p-3.5 border border-stroke bg-white/5 rounded-2xl">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText className="w-5 h-5 text-accent-purple shrink-0" />
              <span className="text-sm text-white truncate font-medium">{receiptFile.name}</span>
              <span className="text-[10px] text-text-muted/60 shrink-0">
                ({(receiptFile.size / 1024 / 1024).toFixed(2)} MB)
              </span>
            </div>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-text-muted hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-stroke/50 bg-white/[0.01] hover:bg-white/[0.03] hover:border-stroke p-5 rounded-2xl text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            <FileText className="w-6 h-6 text-text-muted/60" />
            <span className="text-xs text-text-muted font-semibold">Click to select receipt</span>
            <span className="text-[10px] text-text-muted/40">Accepts JPG, PNG, PDF up to 5MB</span>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".jpg,.jpeg,.png,.pdf"
              className="hidden"
            />
          </div>
        )}
      </div>

      {/* Submit Buttons */}
      <div className="flex gap-3.5 mt-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="custom-btn custom-btn-secondary py-3.5 flex-1 text-sm cursor-pointer text-center"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="custom-btn py-3.5 flex-[2] text-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Saving Expense...</span>
            </>
          ) : (
            <span>Save Expense</span>
          )}
        </button>
      </div>
    </form>
  )
}
