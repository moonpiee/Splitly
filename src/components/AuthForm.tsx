'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/utils/supabase/client'
import { userIdToEmail, normalizeUserId, formatUserId } from '@/utils/auth-map'
import { Lock, User, UserCheck, AlertCircle, Loader2, Copy, Check } from 'lucide-react'

interface AuthFormProps {
  mode: 'login' | 'signup'
}

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const supabase = createClient()
  
  const [displayName, setDisplayName] = useState('')
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [registeredId, setRegisteredId] = useState('')
  const [copied, setCopied] = useState(false)

  const handleCopyId = () => {
    navigator.clipboard.writeText(registeredId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const normalizedId = normalizeUserId(userId)
    if (!normalizedId) {
      setError('Please enter a User ID.')
      setLoading(false)
      return
    }

    if (normalizedId.length < 3) {
      setError('User ID must be at least 3 characters.')
      setLoading(false)
      return
    }

    const email = userIdToEmail(normalizedId)

    try {
      if (mode === 'signup') {
        if (!displayName.trim()) {
          setError('Please enter a display name.')
          setLoading(false)
          return
        }

        // 1. Check if unique_user_id is already taken in profiles table
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('unique_user_id')
          .eq('unique_user_id', normalizedId)
          .maybeSingle()

        if (existingUser) {
          setError(`Username @${normalizedId} is already taken.`)
          setLoading(false)
          return
        }

        // 2. Perform Supabase Sign Up
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              unique_user_id: normalizedId,
              display_name: displayName.trim(),
            },
          },
        })

        if (signUpError) {
          setError(signUpError.message)
          setLoading(false)
          return
        }

        if (data.user) {
          setRegisteredId(formatUserId(normalizedId))
          setSignupSuccess(true)
          setLoading(false)
        }
      } else {
        // Sign In
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) {
          setError('Invalid username or password. Please try again.')
          setLoading(false)
          return
        }

        router.refresh()
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.')
      setLoading(false)
    }
  }

  if (signupSuccess) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-8 text-center flex flex-col items-center gap-6 max-w-md w-full"
      >
        <div className="w-16 h-16 rounded-full bg-accent-green/10 flex items-center justify-center text-accent-green mb-2">
          <UserCheck className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-text-main">Account Created!</h2>
          <p className="text-text-muted mt-2">Your Splitly account is ready. Here is your permanent, shareable user ID for group invites:</p>
        </div>

        <div className="flex items-center justify-between gap-4 w-full bg-slate-900/60 border border-stroke px-4 py-3 rounded-2xl font-mono text-lg text-white">
          <span>{registeredId}</span>
          <button 
            onClick={handleCopyId}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-text-muted hover:text-white cursor-pointer"
            title="Copy User ID"
          >
            {copied ? <Check className="w-5 h-5 text-accent-green" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>

        <button 
          onClick={() => {
            router.refresh()
            router.push('/dashboard')
          }}
          className="custom-btn w-full mt-2 py-3.5"
        >
          Go to Dashboard
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-panel p-8 max-w-md w-full"
    >
      <div className="text-center mb-6">
        <div className="logo w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-purple to-accent-green mx-auto mb-4 flex items-center justify-center shadow-custom">
          <span className="text-white font-extrabold text-2xl">S</span>
        </div>
        <h2 className="text-2xl font-bold text-text-main">
          {mode === 'signup' ? 'Create an Account' : 'Welcome Back'}
        </h2>
        <p className="text-text-muted mt-1.5 text-sm">
          {mode === 'signup' ? 'Join Splitly and split expenses in seconds.' : 'Enter your credentials to access your dashboard.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {mode === 'signup' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] text-text-muted font-medium ml-1">Display Name</label>
            <div className="relative">
              <User className="absolute left-4 top-3.5 w-5 h-5 text-text-muted/60" />
              <input
                required
                type="text"
                placeholder="e.g. John Doe"
                className="custom-input pl-12"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] text-text-muted font-medium ml-1">User ID</label>
          <div className="relative">
            <span className="absolute left-4 top-3.5 text-text-muted/60 font-semibold font-mono">@</span>
            <input
              required
              type="text"
              placeholder="username"
              className="custom-input pl-9 font-mono"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </div>
          <span className="text-[11px] text-text-muted/50 ml-1">
            Min 3 chars. Only numbers, letters, underscores.
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] text-text-muted font-medium ml-1">Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-3.5 w-5 h-5 text-text-muted/60" />
            <input
              required
              type="password"
              placeholder="••••••••"
              className="custom-input pl-12"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="custom-btn w-full mt-2 py-3.5 flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Please wait...</span>
            </>
          ) : (
            <span>{mode === 'signup' ? 'Create Account' : 'Sign In'}</span>
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-text-muted">
        {mode === 'signup' ? (
          <>
            Already have an account?{' '}
            <button
              onClick={() => router.push('/login')}
              className="text-accent-purple hover:underline font-semibold cursor-pointer"
            >
              Sign In
            </button>
          </>
        ) : (
          <>
            Don&apos;t have an account yet?{' '}
            <button
              onClick={() => router.push('/signup')}
              className="text-accent-purple hover:underline font-semibold cursor-pointer"
            >
              Create Account
            </button>
          </>
        )}
      </div>
    </motion.div>
  )
}
