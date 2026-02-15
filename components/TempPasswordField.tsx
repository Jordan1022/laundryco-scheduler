'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const LOWER = 'abcdefghijkmnopqrstuvwxyz'
const NUMBERS = '23456789'
const SYMBOLS = '@#$%*-_'
const ALL = `${UPPER}${LOWER}${NUMBERS}${SYMBOLS}`

function randomInt(max: number) {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const bytes = new Uint32Array(1)
    window.crypto.getRandomValues(bytes)
    return bytes[0] % max
  }
  return Math.floor(Math.random() * max)
}

function pick(chars: string) {
  return chars[randomInt(chars.length)]
}

function shuffle(value: string) {
  const arr = value.split('')
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1)
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr.join('')
}

function generateTempPassword(length: number) {
  const targetLength = Math.max(length, 10)
  const seed = [
    pick(UPPER),
    pick(LOWER),
    pick(NUMBERS),
    pick(SYMBOLS),
  ]

  while (seed.length < targetLength) {
    seed.push(pick(ALL))
  }

  return shuffle(seed.join(''))
}

type TempPasswordFieldProps = {
  id: string
  name: string
  minLength?: number
  inputClassName?: string
}

export default function TempPasswordField({ id, name, minLength = 8, inputClassName }: TempPasswordFieldProps) {
  const [password, setPassword] = useState(() => generateTempPassword(Math.max(minLength, 12)))
  const [copied, setCopied] = useState(false)

  const handleGenerate = () => {
    setPassword(generateTempPassword(Math.max(minLength, 12)))
    setCopied(false)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          id={id}
          name={name}
          type="text"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={minLength}
          required
          className={inputClassName}
        />
        <Button type="button" size="sm" variant="outline" onClick={handleGenerate}>
          Generate
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={handleCopy}>
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Share this temporary password securely.</p>
    </div>
  )
}
