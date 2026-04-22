import {
  Alfa_Slab_One,
  Instrument_Serif,
  Inter_Tight,
  JetBrains_Mono,
  Lobster,
} from 'next/font/google'

export const serif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})

export const sans = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

// Brand display faces — reserve for hero/badge moments (see BRAND.md §3).
export const script = Lobster({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-script',
  display: 'swap',
})

export const display = Alfa_Slab_One({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
  display: 'swap',
})
