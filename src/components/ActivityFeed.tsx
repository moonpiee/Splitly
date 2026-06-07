'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ActivityItem } from '@/utils/dashboard-data'
import { Receipt, CreditCard, Sparkles } from 'lucide-react'

interface ActivityFeedProps {
  activity: ActivityItem[]
}

export default function ActivityFeed({ activity }: ActivityFeedProps) {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return dateString
    }
  }

  if (activity.length === 0) {
    return (
      <div className="glass-panel p-8 text-center flex flex-col items-center justify-center min-h-[200px]">
        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-text-muted mb-3 border border-stroke">
          <Sparkles className="w-5 h-5 text-accent-purple" />
        </div>
        <h3 className="font-semibold text-text-main">No recent activity</h3>
        <p className="text-sm text-text-muted mt-1 max-w-[28ch]">
          Add an expense or join a group to see transaction logs here.
        </p>
      </div>
    )
  }

  return (
    <div className="glass-panel p-6 flex flex-col gap-4">
      <h2 className="text-lg font-bold text-text-main mb-1">Recent activity</h2>
      
      <div className="flex flex-col gap-3">
        {activity.map((item, idx) => {
          const isExpense = item.type === 'expense'
          const formattedDate = formatDate(item.date)

          // Formatter for display badge delta
          let badgeText = ''
          let badgeClass = ''
          
          if (isExpense) {
            if (item.rawDelta > 0) {
              badgeText = `+₹${Math.round(item.rawDelta).toLocaleString()}`
              badgeClass = 'bg-accent-green/10 text-accent-green border-accent-green/20'
            } else if (item.rawDelta < 0) {
              badgeText = `-₹${Math.round(Math.abs(item.rawDelta)).toLocaleString()}`
              badgeClass = 'bg-danger/10 text-danger border-danger/20'
            } else {
              badgeText = 'Settled'
              badgeClass = 'bg-white/5 text-text-muted border-stroke'
            }
          } else {
            badgeText = 'Settled'
            badgeClass = 'bg-white/5 text-text-muted border-stroke'
          }

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.05 }}
              className="flex justify-between items-center gap-4 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${isExpense ? 'bg-accent-purple/10 text-accent-purple border-accent-purple/20' : 'bg-accent-green/10 text-accent-green border-accent-green/20'}`}>
                  {isExpense ? <Receipt className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                </div>
                <div>
                  <div className="font-semibold text-sm text-text-main leading-snug">
                    {item.title}
                  </div>
                  <div className="text-[12px] text-text-muted mt-0.5">
                    {item.description}
                  </div>
                  <div className="text-[10px] text-text-muted/50 mt-1 flex items-center gap-2">
                    <span>{formattedDate}</span>
                    <span>•</span>
                    <Link href={`/group/${item.groupId}`} className="hover:underline text-accent-purple">
                      {item.groupName}
                    </Link>
                  </div>
                </div>
              </div>
              
              <span className={`chip border text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ${badgeClass}`}>
                {badgeText}
              </span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
