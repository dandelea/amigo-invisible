import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { t } from '@/texts/es'

type CopyState = 'idle' | 'copied' | 'failed'

// Enlace en una caja, botón «Copiar enlace» y confirmación visible que
// también se anuncia a los lectores de pantalla.
export function CopyLinkBox({
  url,
  primary,
}: {
  url: string
  primary?: boolean
}) {
  const [state, setState] = useState<CopyState>('idle')
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setState('copied')
    } catch {
      setState('failed')
    }
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setState('idle'), 4000)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-xl border bg-background p-2.5 text-[13px] break-all select-all">
        {url}
      </div>
      <Button variant={primary ? 'primary' : 'secondary'} onClick={copy}>
        {t.copy.button}
      </Button>
      <p aria-live="polite" className="min-h-5 text-[13px] font-semibold">
        {state === 'copied' && (
          <span className="text-success-foreground">{t.copy.done}</span>
        )}
        {state === 'failed' && (
          <span className="text-destructive">{t.copy.failed}</span>
        )}
      </p>
    </div>
  )
}
