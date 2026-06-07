'use client'

import { motion } from 'framer-motion'
import { ArrowUpRight, ArrowDownLeft, Wallet } from 'lucide-react'

interface SummaryCardsProps {
  totalOwedToYou: number
  totalYouOwe: number
  netBalance: number
}

export default function SummaryCards({
  totalOwedToYou,
  totalYouOwe,
  netBalance,
}: SummaryCardsProps) {
  const cards = [
    {
      label: 'Total owed to you',
      value: `₹${totalOwedToYou.toLocaleString('en-IN')}`,
      type: 'up',
      colorClass: 'text-accent-green',
      bgClass: 'bg-accent-green/5',
      icon: ArrowUpRight,
    },
    {
      label: 'Total you owe',
      value: `₹${totalYouOwe.toLocaleString('en-IN')}`,
      type: 'down',
      colorClass: 'text-danger',
      bgClass: 'bg-danger/5',
      icon: ArrowDownLeft,
    },
    {
      label: 'Net balance',
      value: netBalance >= 0 ? `+₹${netBalance.toLocaleString('en-IN')}` : `-₹${Math.abs(netBalance).toLocaleString('en-IN')}`,
      type: 'net',
      colorClass: netBalance >= 0 ? 'text-accent-green font-bold' : 'text-danger font-bold',
      bgClass: 'bg-white/5',
      icon: Wallet,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
      {cards.map((card, idx) => {
        const Icon = card.icon
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.1 }}
            className="glass-panel p-6 flex flex-col justify-between relative overflow-hidden"
          >
            {/* Background Accent */}
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full filter blur-[40px] opacity-20 -mr-6 -mt-6 ${card.type === 'up' ? 'bg-accent-green' : card.type === 'down' ? 'bg-danger' : 'bg-accent-purple'}`} />
            
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px] text-text-muted font-medium">{card.label}</span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${card.bgClass} ${card.colorClass}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            
            <div className={`text-2xl font-extrabold tracking-tight ${card.colorClass}`}>
              {card.value}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
