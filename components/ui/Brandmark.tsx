import Image from 'next/image'
import { cn } from '@/lib/utils'

type BrandmarkVariant = 'stamp' | 'wordmark-leaguecity' | 'mascot'

type BrandmarkSize = 'sm' | 'md' | 'lg' | 'xl'

type BrandmarkProps = {
  size?: BrandmarkSize
  variant?: BrandmarkVariant
  withWordmark?: boolean
  subtitle?: string
  className?: string
}

const stampSizeClasses: Record<BrandmarkSize, string> = {
  sm: 'h-9 w-9 text-[10px]',
  md: 'h-12 w-12 text-xs',
  lg: 'h-16 w-16 text-sm',
  xl: 'h-24 w-24 text-base',
}

const artworkSizeClasses: Record<BrandmarkSize, string> = {
  sm: 'h-10',
  md: 'h-16',
  lg: 'h-24',
  xl: 'h-40',
}

const artworkSizePx: Record<BrandmarkSize, number> = {
  sm: 40,
  md: 64,
  lg: 96,
  xl: 160,
}

// Filenames map to actual files in /public/brand/. Add new variants as artwork lands.
const variantSources: Record<Exclude<BrandmarkVariant, 'stamp'>, { src: string; alt: string; aspect: number }> = {
  'wordmark-leaguecity': {
    src: '/brand/wordmark-leaguecity-above.png',
    alt: 'The Laundry Co. — League City',
    aspect: 1.52,
  },
  mascot: {
    src: '/brand/mascot-washer-character.png',
    alt: 'Laundry Co. mascot',
    aspect: 0.93,
  },
}

export function Brandmark({
  size = 'md',
  variant = 'stamp',
  withWordmark = false,
  subtitle,
  className,
}: BrandmarkProps) {
  if (variant !== 'stamp') {
    const meta = variantSources[variant]
    const heightPx = artworkSizePx[size]
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <Image
          src={meta.src}
          alt={meta.alt}
          width={Math.round(heightPx * meta.aspect)}
          height={heightPx}
          className={cn('w-auto object-contain', artworkSizeClasses[size])}
          priority={size === 'lg' || size === 'xl'}
        />
        {withWordmark ? <BrandSubtitle subtitle={subtitle} /> : null}
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'relative grid place-items-center rounded-full bg-ink text-paper shadow-stamp',
          stampSizeClasses[size],
        )}
      >
        <div className="absolute inset-1 rounded-full border border-paper/30" />
        <span className="stamp relative">LC</span>
      </div>
      {withWordmark ? <BrandSubtitle subtitle={subtitle} /> : null}
    </div>
  )
}

function BrandSubtitle({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="font-serif text-lg text-ink">Laundry Co.</span>
      <span className="stamp text-ink/50">{subtitle ?? 'Shift ticket office'}</span>
    </div>
  )
}
