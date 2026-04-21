import { cn } from '@/lib/utils'

type BrandmarkProps = {
  size?: 'sm' | 'md' | 'lg'
  withWordmark?: boolean
  subtitle?: string
  className?: string
}

const sizeClasses = {
  sm: 'h-9 w-9 text-[10px]',
  md: 'h-12 w-12 text-xs',
  lg: 'h-16 w-16 text-sm',
}

export function Brandmark({ size = 'md', withWordmark = false, subtitle, className }: BrandmarkProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'relative grid place-items-center rounded-full bg-ink text-paper shadow-stamp',
          sizeClasses[size],
        )}
      >
        <div className="absolute inset-1 rounded-full border border-paper/30" />
        <span className="stamp relative">LC</span>
      </div>
      {withWordmark ? (
        <div className="flex flex-col leading-tight">
          <span className="font-serif text-lg text-ink">Laundry Co.</span>
          <span className="stamp text-ink/50">{subtitle ?? 'Shift ticket office'}</span>
        </div>
      ) : null}
    </div>
  )
}
