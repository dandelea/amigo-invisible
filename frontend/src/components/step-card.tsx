import { Avatar } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'

// Uno de los tres pasos del inicio.
export function StepCard({
  step,
  title,
  body,
}: {
  step: number
  title: string
  body: string
}) {
  return (
    <Card className="flex-row items-center gap-2.5">
      <Avatar>{step}</Avatar>
      <div>
        <h2 className="text-[17px] font-semibold">{title}</h2>
        <p className="text-[13px] text-muted-foreground">{body}</p>
      </div>
    </Card>
  )
}
