import { cn } from "@/lib/utils"

export type TaskStatus = "assigned" | "started" | "in_progress" | "completed" | "reviewed" | "on_hold"

interface StatusBadgeProps {
  status: TaskStatus
  className?: string
}

const statusConfig: Record<TaskStatus, { label: string; color: string }> = {
  assigned:    { label: "Assigned",    color: "bg-slate-100    text-slate-700   dark:bg-slate-800   dark:text-slate-300"   },
  started:     { label: "Started",     color: "bg-blue-100     text-blue-700    dark:bg-blue-900/40 dark:text-blue-300"    },
  in_progress: { label: "In Progress", color: "bg-indigo-100   text-indigo-700  dark:bg-indigo-900/40 dark:text-indigo-300" },
  completed:   { label: "Completed",   color: "bg-emerald-100  text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  reviewed:    { label: "Reviewed",    color: "bg-cyan-100     text-cyan-700    dark:bg-cyan-900/40 dark:text-cyan-300"    },
  on_hold:     { label: "On Hold",     color: "bg-rose-100     text-rose-700    dark:bg-rose-900/40 dark:text-rose-300"    },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { label, color } = statusConfig[status]
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
      color, className
    )}>
      {label}
    </span>
  )
}
