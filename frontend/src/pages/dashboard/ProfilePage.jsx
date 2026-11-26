import { User, Mail, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { PageContainer } from '@/components/PageContainer'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { capitalize, formatDate } from '@/utils/format'

export function ProfilePage() {
  const { user } = useAuth()

  return (
    <PageContainer maxWidth="lg" className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-navy-900 tracking-tight">
          Profile
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Your ParkEase account details and verification status.
        </p>
      </div>

      <Card noPadding>
        <Card.Header>
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center size-10 rounded-lg bg-navy-50 text-navy-800 border border-navy-200">
              <User size={18} strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-text-primary font-display">
                Account Information
              </h2>
              <p className="text-xs text-text-tertiary">
                Authenticated user details from your session
              </p>
            </div>
          </div>
          {user?.isVerified && (
            <Badge label="Verified" variant="teal" />
          )}
        </Card.Header>

        <div className="divide-y divide-border">
          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
              Full Name
            </span>
            <span className="text-sm font-medium text-text-primary">
              {user?.name ?? '—'}
            </span>
          </div>

          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider flex items-center gap-1.5">
              <Mail size={13} />
              Email Address
            </span>
            <span className="text-sm font-medium text-text-primary">
              {user?.email ?? '—'}
            </span>
          </div>

          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={13} />
              Account Role
            </span>
            <span className="text-sm font-medium text-text-primary">
              {capitalize(user?.role ?? 'customer')}
            </span>
          </div>

          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 size={13} />
              Email Verification
            </span>
            <span className="text-sm font-medium text-text-primary">
              {user?.isVerified ? 'Verified' : 'Pending verification'}
            </span>
          </div>

          {user?.createdAt && (
            <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
                Member Since
              </span>
              <span className="text-sm font-medium text-text-primary">
                {formatDate(user.createdAt)}
              </span>
            </div>
          )}
        </div>
      </Card>
    </PageContainer>
  )
}
