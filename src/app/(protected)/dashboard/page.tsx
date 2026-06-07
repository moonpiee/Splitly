import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { fetchDashboardData } from '@/utils/dashboard-data'
import SummaryCards from '@/components/SummaryCards'
import GroupList from '@/components/GroupList'
import ActivityFeed from '@/components/ActivityFeed'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const data = await fetchDashboardData(supabase, user.id)

  return (
    <>
      {/* Hero Header Card */}
      <section className="glass-panel p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-r from-accent-purple/15 to-accent-green/5">
        <div className="max-w-[65ch]">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-2 leading-[1.15]">
            See who owes what, without the clutter.
          </h1>
          <p className="text-text-muted text-sm leading-relaxed">
            Create groups by public ID, split expenses in seconds, and optionally attach a receipt. Safe, RLS-backed, and beautifully simple.
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <Link
            href="/expense/new"
            className="custom-btn py-3 px-5 text-sm"
          >
            + Add Expense
          </Link>
        </div>
      </section>

      {/* Summary Stats Cards */}
      <SummaryCards
        totalOwedToYou={data.totalOwedToYou}
        totalYouOwe={data.totalYouOwe}
        netBalance={data.netBalance}
      />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-6">
        {/* Left column: Activity Feed */}
        <ActivityFeed activity={data.recentActivity} />

        {/* Right column: Groups List */}
        <GroupList groups={data.groups} currentUserId={user.id} />
      </div>
    </>
  )
}
