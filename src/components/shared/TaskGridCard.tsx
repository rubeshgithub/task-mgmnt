import { StatusBadge, type TaskStatus } from "./StatusBadge"
import { PriorityBadge, type Priority } from "./PriorityBadge"
import { UserAvatar } from "./UserAvatar"
import { DeadlineIndicator } from "./DeadlineIndicator"
import { cn } from "@/lib/utils"
import { ChevronRight } from "lucide-react"
import type { Assignee } from "./TaskCard"

const priorityBorder: Record<Priority, string> = {
  low:    "border-l-emerald-500",
  medium: "border-l-blue-500",
  high:   "border-l-orange-500",
  urgent: "border-l-rose-500",
}

interface TaskGridCardProps {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: Priority
  deadline: Date
  assignedTo: Assignee[]
  onTaskClick: (taskId: string) => void
  isSelected?: boolean
  className?: string
}

export function TaskGridCard({
  id, title, description, status, priority, deadline, assignedTo,
  onTaskClick, isSelected, className,
}: TaskGridCardProps) {
  return (
    <button
      type="button"
      onClick={() => onTaskClick(id)}
      className={cn(
        "w-full flex flex-col text-left rounded-xl border bg-card border-l-4 p-4 gap-3",
        "hover:shadow-md transition-all duration-150",
        priorityBorder[priority],
        isSelected && "ring-2 ring-primary/40 bg-primary/[0.03]",
        className
      )}
    >
      {/* Title + description */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug line-clamp-2 text-foreground">{title}</p>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">{description}</p>
        )}
      </div>

      {/* Status + priority row */}
      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge status={status} />
        <PriorityBadge priority={priority} />
      </div>

      {/* Deadline + assignees */}
      <div className="flex items-center justify-between gap-2">
        <DeadlineIndicator deadline={deadline} completed={status === "completed"} className="text-xs min-w-0" />
        <div className="flex items-center gap-1 shrink-0">
          <div className="flex -space-x-1.5">
            {assignedTo.slice(0, 3).map((a) => (
              <UserAvatar key={a.id} name={a.name} email={a.email} avatarUrl={a.avatarUrl} size="xs" />
            ))}
            {assignedTo.length > 3 && (
              <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-bold">
                +{assignedTo.length - 3}
              </div>
            )}
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-0.5" />
        </div>
      </div>
    </button>
  )
}
