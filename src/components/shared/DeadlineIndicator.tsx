import { isPast } from "date-fns"
import { AlertCircle, Clock, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface DeadlineIndicatorProps {
  deadline: Date
  completed?: boolean
  className?: string
}

function formatDeadline(date: Date): string {
  const now = new Date()
  const isCurrentYear = date.getFullYear() === now.getFullYear()
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(isCurrentYear ? {} : { year: "numeric" }),
  })
}

export function DeadlineIndicator({ deadline, completed = false, className }: DeadlineIndicatorProps) {
  const isOverdue = isPast(deadline) && !completed
  const daysUntil = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const dueSoon = !completed && !isOverdue && daysUntil <= 3

  return (
    <div className={cn("flex items-center gap-1 text-sm", className)}>
      {completed ? (
        <>
          <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span className="text-emerald-600 dark:text-emerald-400">{formatDeadline(deadline)}</span>
        </>
      ) : isOverdue ? (
        <>
          <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
          <span className="text-rose-600 dark:text-rose-400 font-medium">{formatDeadline(deadline)}</span>
        </>
      ) : (
        <>
          <Clock className={cn("h-3.5 w-3.5 shrink-0", dueSoon ? "text-amber-500" : "text-muted-foreground")} />
          <span className={cn(dueSoon ? "text-amber-600 dark:text-amber-400 font-medium" : "text-muted-foreground")}>
            {formatDeadline(deadline)}
          </span>
        </>
      )}
    </div>
  )
}
