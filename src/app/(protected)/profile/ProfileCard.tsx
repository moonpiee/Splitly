'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { formatUserId } from '@/utils/auth-map'
import { Copy, Check, Edit2, Loader2, Save, Users } from 'lucide-react'

interface ProfileCardProps {
  profile: any
  groupCount: number
  groups: any[]
}

export default function ProfileCard({ profile, groupCount, groups }: ProfileCardProps) {
  const router = useRouter()
  const supabase = createClient()

  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCopyId = () => {
    const rawId = profile?.unique_user_id || ''
    navigator.clipboard.writeText(formatUserId(rawId))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) return

    setSaving(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ display_name: displayName.trim() })
        .eq('id', profile.id)

      if (updateError) throw updateError

      setIsEditing(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Could not update profile.')
    } finally {
      setSaving(false)
    }
  }

  const initials = (profile?.display_name || 'U')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  return (
    <div className="flex flex-col gap-6">
      {/* Upper Info Row */}
      <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-purple to-accent-green flex items-center justify-center text-white font-extrabold text-2xl shadow-custom shrink-0">
          {initials}
        </div>

        <div className="flex-1 text-center sm:text-left min-w-0 w-full">
          {isEditing ? (
            <form onSubmit={handleSave} className="flex gap-2 w-full max-w-md items-center">
              <input
                required
                className="custom-input py-2 px-3.5 text-sm"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <button
                type="submit"
                disabled={saving}
                className="custom-btn py-2.5 px-4 text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDisplayName(profile?.display_name || '')
                  setIsEditing(false)
                }}
                className="custom-btn custom-btn-secondary py-2.5 px-3 text-xs shrink-0 cursor-pointer"
              >
                Cancel
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-center sm:justify-start gap-2.5">
              <h3 className="text-xl font-bold text-text-main truncate">
                {profile?.display_name || 'User'}
              </h3>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 rounded bg-white/5 hover:bg-white/10 text-text-muted hover:text-white cursor-pointer"
                title="Edit Display Name"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {error && <div className="text-xs text-danger mt-1">{error}</div>}

          <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
            <span className="text-text-muted text-sm font-mono bg-white/5 px-2.5 py-1 rounded-lg border border-stroke">
              {profile?.unique_user_id ? formatUserId(profile.unique_user_id) : ''}
            </span>
            <button
              onClick={handleCopyId}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-text-muted hover:text-white cursor-pointer transition-colors"
              title="Copy User ID"
            >
              {copied ? <Check className="w-4 h-4 text-accent-green" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
          <span className="text-xs text-text-muted">Total Joined Groups</span>
          <div className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
            <Users className="w-5 h-5 text-accent-purple" />
            <span>{groupCount}</span>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
          <span className="text-xs text-text-muted">User ID status</span>
          <div className="text-sm font-semibold text-accent-green mt-2.5">
            Active & shareable
          </div>
        </div>
      </div>

      {/* Member of Groups List */}
      <div className="flex flex-col gap-3">
        <h4 className="font-bold text-sm text-text-main">Groups List</h4>
        {groups.length === 0 ? (
          <p className="text-xs text-text-muted">You are not a member of any group.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {groups.map((group) => (
              <span
                key={group.id}
                className="chip border px-3 py-1.5 rounded-full text-xs text-text-muted"
              >
                {group.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
