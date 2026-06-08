import { StatusBadge, type TaskStatus } from "./StatusBadge"
import { PriorityBadge, type Priority } from "./PriorityBadge"
import { UserAvatar } from "./UserAvatar"
import { DeadlineIndicator } from "./DeadlineIndicator"
import { cn } from "@/lib/utils"
import { ChevronRight } from "lucide-react"

export interface Assignee {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

interface TaskCardProps {
  id: string
  title: string
  status: TaskStatus
  priority: Priority
  deadline: Date
  assignedTo: Assignee[]
  onTaskClick: (taskId: string) => void
  isSelected?: boolean
  className?: string
}

// Responsive grid: mobile 4-col → tablet 5-col → desktop 6-col
export const TASK_GRID =
  "grid-cols-[32px_1fr_110px_20px] md:grid-cols-[32px_1fr_120px_138px_20px] lg:grid-cols-[36px_1fr_130px_148px_84px_20px]"

export function TaskCard({
  id, title, status, priority, deadline, assignedTo,
  onTaskClick, isSelected, className,
}: TaskCardProps) {
  return (
    <button
      type="button"
      onClick={() => onTaskClick(id)}
      className={cn(
        "w-full grid items-center gap-3 px-4 py-2.5 rounded-lg border bg-card text-left",
        TASK_GRID,
        "hover:border-primary/40 hover:bg-primary/[0.02] transition-all",
        isSelected && "border-primary/50 bg-primary/5",
        className
      )}
    >
      {/* Priority dot */}
      <div className="flex justify-center">
        <PriorityBadge priority={priority} showLabel={false} />
      </div>

      {/* Title */}
      <span className="truncate text-sm font-medium">{title}</span>

      {/* Status */}
      <div><StatusBadge status={status} className="text-xs" /></div>

      {/* Deadline — hidden on mobile */}
      <div className="hidden md:block">
        <DeadlineIndicator deadline={deadline} completed={status === "completed"} className="text-xs" />
      </div>

      {/* Assignee avatars — hidden below lg */}
      <div className="hidden lg:flex -space-x-1.5 justify-end">
        {assignedTo.slice(0, 3).map((a) => (
          <UserAvatar key={a.id} name={a.name} email={a.email} avatarUrl={a.avatarUrl} size="xs" />
        ))}
        {assignedTo.length > 3 && (
          <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-bold">
            +{assignedTo.length - 3}
          </div>
        )}
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  )
}
