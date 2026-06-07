'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/utils/supabase/client'
import { Plus, Users, Loader2, ArrowRight, Link as LinkIcon } from 'lucide-react'

interface GroupsListContainerProps {
  groups: any[]
  currentUserId: string
}

export default function GroupsListContainer({ groups, currentUserId }: GroupsListContainerProps) {
  const router = useRouter()
  const supabase = createClient()

  // Creating State
  const [isCreating, setIsCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Joining State
  const [isJoining, setIsJoining] = useState(false)
  const [joinGroupId, setJoinGroupId] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setCreateLoading(true)
    setCreateError(null)

    try {
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
      setCreateError(err.message || 'Could not create group.')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanedGroupId = joinGroupId.trim()
    if (!cleanedGroupId) return

    setJoinLoading(true)
    setJoinError(null)

    try {
      // 1. Check if group exists
      const { data: targetGroup, error: fetchError } = await supabase
        .from('groups')
        .select('id, name')
        .eq('id', cleanedGroupId)
        .maybeSingle()

      if (fetchError || !targetGroup) {
        setJoinError('Group not found. Please check the Group ID.')
        setJoinLoading(false)
        return
      }

      // 2. Check if already a member
      const { data: existingMember } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', cleanedGroupId)
        .eq('profile_id', currentUserId)
        .maybeSingle()

      if (existingMember) {
        setJoinError('You are already a member of this group.')
        setJoinLoading(false)
        return
      }

      // 3. Join Group
      const { error: joinErr } = await supabase
        .from('group_members')
        .insert({
          group_id: cleanedGroupId,
          profile_id: currentUserId,
        })

      if (joinErr) throw joinErr

      setJoinGroupId('')
      setIsJoining(false)
      router.refresh()
      router.push(`/group/${cleanedGroupId}`)
    } catch (err: any) {
      setJoinError(err.message || 'Could not join group.')
    } finally {
      setJoinLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      {/* Header and Quick Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Groups</h1>
          <p className="text-text-muted text-sm mt-1">Manage your expense splitting groups or join one.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              setIsJoining(false)
              setIsCreating(!isCreating)
            }}
            className="custom-btn py-2.5 px-4 text-sm flex items-center gap-1.5 cursor-pointer flex-1 sm:flex-none justify-center"
          >
            <Plus className="w-4 h-4" />
            <span>Create Group</span>
          </button>
          <button
            onClick={() => {
              setIsCreating(false)
              setIsJoining(!isJoining)
            }}
            className="custom-btn custom-btn-secondary py-2.5 px-4 text-sm flex items-center gap-1.5 cursor-pointer flex-1 sm:flex-none justify-center"
          >
            <LinkIcon className="w-4 h-4" />
            <span>Join with ID</span>
          </button>
        </div>
      </div>

      {/* Forms Drawer/Accordions */}
      <AnimatePresence mode="wait">
        {isCreating && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleCreateGroup}
            className="glass-panel p-6 flex flex-col gap-4 overflow-hidden bg-accent-purple/5"
          >
            <div>
              <h3 className="font-bold text-base text-text-main">Create a New Group</h3>
              <p className="text-xs text-text-muted mt-0.5">Start a group to split expenses with friends.</p>
            </div>
            
            {createError && <div className="text-xs text-danger">{createError}</div>}

            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-muted font-medium ml-1">Group Name</label>
              <input
                required
                placeholder="e.g. Shared Apartment"
                className="custom-input text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-muted font-medium ml-1">Description (Optional)</label>
              <input
                placeholder="e.g. Utility bills and grocery splittings"
                className="custom-input text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="custom-btn custom-btn-secondary py-2 px-4 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createLoading}
                className="custom-btn py-2 px-4 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {createLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Create Group</span>
              </button>
            </div>
          </motion.form>
        )}

        {isJoining && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleJoinGroup}
            className="glass-panel p-6 flex flex-col gap-4 overflow-hidden bg-accent-green/5"
          >
            <div>
              <h3 className="font-bold text-base text-text-main">Join an Existing Group</h3>
              <p className="text-xs text-text-muted mt-0.5">Enter the unique group ID (UUID) shared by another member.</p>
            </div>
            
            {joinError && <div className="text-xs text-danger">{joinError}</div>}

            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-muted font-medium ml-1">Group ID (UUID)</label>
              <input
                required
                placeholder="e.g. xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="custom-input text-sm font-mono"
                value={joinGroupId}
                onChange={(e) => setJoinGroupId(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => setIsJoining(false)}
                className="custom-btn custom-btn-secondary py-2 px-4 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={joinLoading}
                className="custom-btn py-2 px-4 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {joinLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Join Group</span>
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Groups Listing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.length === 0 ? (
          <div className="glass-panel p-8 text-center text-text-muted col-span-2">
            <Users className="w-8 h-8 mx-auto mb-3 text-text-muted/60" />
            <h3 className="font-bold text-text-main text-base">No groups joined</h3>
            <p className="text-xs text-text-muted mt-1.5 max-w-[32ch] mx-auto">
              Create a group to invite friends, or paste a group ID to join an existing one.
            </p>
          </div>
        ) : (
          groups.map((group) => {
            const userNet = group.netBalances[currentUserId] || 0
            
            let statusText = 'Settled up'
            let statusClass = 'text-text-muted'
            
            if (userNet > 0) {
              statusText = `You are owed ₹${userNet.toLocaleString()}`
              statusClass = 'text-accent-green font-semibold'
            } else if (userNet < 0) {
              statusText = `You owe ₹${Math.abs(userNet).toLocaleString()}`
              statusClass = 'text-danger font-semibold'
            }

            return (
              <Link
                key={group.id}
                href={`/group/${group.id}`}
                className="glass-panel p-5 hover:bg-white/[0.04] hover:border-stroke transition-all group flex flex-col justify-between min-h-[140px]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-text-main text-base group-hover:text-accent-purple transition-colors truncate">
                      {group.name}
                    </h3>
                    <p className="text-xs text-text-muted mt-1 truncate">
                      {group.description || 'No description provided.'}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center text-accent-purple shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                </div>

                <div className="flex items-end justify-between border-t border-stroke/50 pt-3 mt-4 text-xs">
                  <div className="text-text-muted flex items-center gap-1.5">
                    <span>{group.members.length} members</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <span className={statusClass}>{statusText}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-text-muted group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
