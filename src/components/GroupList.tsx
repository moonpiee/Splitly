'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/utils/supabase/client'
import { Plus, Users, Loader2, ArrowRight } from 'lucide-react'

interface GroupListProps {
  groups: any[]
  currentUserId: string
}

export default function GroupList({ groups, currentUserId }: GroupListProps) {
  const router = useRouter()
  const supabase = createClient()

  const [isCreating, setIsCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    setError(null)

    try {
      // 1. Insert Group
      const { data: newGroup, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          created_by: currentUserId,
        })
        .select()
        .single()

      if (groupError) throw groupError

      // 2. Add Creator to group_members
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: newGroup.id,
          profile_id: currentUserId,
        })

      if (memberError) throw memberError

      setName('')
      setDescription('')
      setIsCreating(false)
      router.refresh()
      router.push(`/group/${newGroup.id}`)
    } catch (err: any) {
      setError(err.message || 'Could not create group.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-lg font-bold text-text-main">Your groups</h2>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="custom-btn py-2 px-3.5 text-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Group</span>
        </button>
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleCreateGroup}
            className="glass-panel p-5 flex flex-col gap-3.5 overflow-hidden"
          >
            <h3 className="font-bold text-sm text-text-main">New Group</h3>
            
            {error && <div className="text-xs text-danger">{error}</div>}

            <input
              required
              placeholder="Group name (e.g. Goa Trip)"
              className="custom-input py-2.5 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              placeholder="Description (optional)"
              className="custom-input py-2.5 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="flex justify-end gap-2 mt-1">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="custom-btn custom-btn-secondary py-2 px-4 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="custom-btn py-2 px-4 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Create</span>
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-3">
        {groups.length === 0 ? (
          <div className="glass-panel p-6 text-center text-text-muted text-sm">
            You are not in any groups yet. Create one above to get started!
          </div>
        ) : (
          groups.map((group, idx) => {
            const userNet = group.netBalances[currentUserId] || 0
            
            let statusText = 'Settled'
            let statusClass = 'text-text-muted'
            
            if (userNet > 0) {
              statusText = `You are owed ₹${userNet.toLocaleString()}`
              statusClass = 'text-accent-green font-semibold'
            } else if (userNet < 0) {
              statusText = `You owe ₹${Math.abs(userNet).toLocaleString()}`
              statusClass = 'text-danger font-semibold'
            }

            return (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.05 }}
              >
                <Link
                  href={`/group/${group.id}`}
                  className="flex justify-between items-center p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] hover:border-stroke transition-all group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center text-accent-purple">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-text-main group-hover:text-accent-purple transition-colors">
                        {group.name}
                      </h4>
                      <p className="text-xs text-text-muted mt-0.5">
                        {group.members.length} members
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <div className={`text-xs ${statusClass}`}>{statusText}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-text-muted group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}
