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
      className="sticky top-0 z-20 -mx-4 border-b bg-background/95 px-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
    >
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === active
          return (
            <Link
              key={tab.id}
              href={`/admin?tab=${tab.id}`}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors',
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && tab.badge > 0 ? (
                <span
                  className={cn(
                    'inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs font-semibold',
                    isActive ? 'bg-[#1e3a8a] text-white' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {tab.badge}
                </span>
              ) : null}
              <span
                className={cn(
                  'absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-colors',
                  isActive ? 'bg-[#1e3a8a]' : 'bg-transparent',
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
  if (value === 'shifts' || value === 'requests' || value === 'staff') return value
  return 'overview'
}
