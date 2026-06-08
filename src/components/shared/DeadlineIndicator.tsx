import { formatDistanceToNow, isPast } from "date-fns"
import { AlertCircle, Clock, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface DeadlineIndicatorProps {
  deadline: Date
  completed?: boolean
  className?: string
}

export function DeadlineIndicator({ deadline, completed = false, className }: DeadlineIndicatorProps) {
  const isOverdue = isPast(deadline) && !completed
  const daysUntil = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      {completed ? (
        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
          <CheckCircle className="h-4 w-4" />
          <span>Completed</span>
        </div>
      ) : isOverdue ? (
        <div className="flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold">
          <AlertCircle className="h-4 w-4" />
          <span>Overdue by {Math.abs(daysUntil)} day{Math.abs(daysUntil) !== 1 ? "s" : ""}</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Due {formatDistanceToNow(deadline, { addSuffix: true })}</span>
        </div>
      )}
    </div>
  )
}
