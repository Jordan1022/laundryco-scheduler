import Link from 'next/link'
import { cn } from '@/lib/utils'

export type AdminTabId = 'overview' | 'shifts' | 'requests' | 'staff'

type TabDef = {
  id: AdminTabId
  label: string
  badge?: number
}

type AdminTabsProps = {
  active: AdminTabId
  tabs: TabDef[]
}

export default function AdminTabs({ active, tabs }: AdminTabsProps) {
  return (
    <nav
      aria-label="Admin sections"
      className="sticky top-0 z-20 -mx-4 border-y border-ink/15 bg-paper/95 px-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
    >
      <div className="flex gap-0 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === active
          return (
            <Link
              key={tab.id}
              href={`/admin?tab=${tab.id}`}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'stamp relative flex items-center gap-2 whitespace-nowrap px-5 py-3 transition-colors',
                isActive
                  ? 'text-ink'
                  : 'text-ink/50 hover:text-ink',
              )}
            >
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && tab.badge > 0 ? (
                <span
                  className={cn(
                    'inline-flex min-w-[1.25rem] items-center justify-center rounded-sm border border-dashed px-1.5 text-[10px] font-semibold',
                    isActive ? 'border-cherry text-cherry' : 'border-ink/30 text-ink/60',
                  )}
                >
                  {tab.badge}
                </span>
              ) : null}
              <span
                className={cn(
                  'absolute inset-x-3 -bottom-px h-0.5 transition-colors',
                  isActive ? 'bg-ink' : 'bg-transparent',
                )}
              />
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export function resolveAdminTab(value: string | undefined): AdminTabId {
  if (value === 'overview' || value === 'requests' || value === 'staff') return value
  return 'shifts'
}
