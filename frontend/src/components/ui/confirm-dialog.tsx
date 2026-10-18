import { useState, type ReactNode } from 'react'
import { ApiError } from '@/api/client'
import { errorText, t } from '@/texts/es'
import { Alert } from './alert'
import { Button } from './button'
import { ResponsiveDialog } from './responsive-dialog'

// Confirmación de una acción (salir, expulsar, repetir sorteo…): título,
// texto, aviso opcional y dos botones. Mientras la acción está en curso los
// botones se desactivan; si falla, se muestra el error sin cerrar.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  warning,
  confirmLabel,
  cancelLabel = t.dialog.cancel,
  destructive,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  body: ReactNode
  warning?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (e) {
      setError(
        e instanceof ApiError ? errorText(e.code, e.message) : t.errors.default,
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return
        setError(null)
        onOpenChange(next)
      }}
      title={title}
      showClose={false}
    >
      {warning && <Alert>{warning}</Alert>}
      <div className="text-[15px] text-muted-foreground">{body}</div>
      {error && <Alert variant="error">{error}</Alert>}
      <Button
        variant={destructive ? 'destructive' : 'primary'}
        size="lg"
        onClick={confirm}
        disabled={busy}
      >
        {confirmLabel}
      </Button>
      <Button onClick={() => onOpenChange(false)} disabled={busy}>
        {cancelLabel}
      </Button>
    </ResponsiveDialog>
  )
}
