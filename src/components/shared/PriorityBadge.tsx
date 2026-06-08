import { cn } from "@/lib/utils"

export type Priority = "low" | "medium" | "high" | "urgent"

interface PriorityBadgeProps {
  priority: Priority
  showLabel?: boolean
  className?: string
}

const priorityConfig: Record<Priority, { label: string; dot: string; color: string }> = {
  low:    { label: "Low",    dot: "bg-emerald-500", color: "bg-emerald-50  text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  medium: { label: "Medium", dot: "bg-blue-500",    color: "bg-blue-50    text-blue-700    dark:bg-blue-900/30   dark:text-blue-300"    },
  high:   { label: "High",   dot: "bg-orange-500",  color: "bg-orange-50  text-orange-700  dark:bg-orange-900/30 dark:text-orange-300"  },
  urgent: { label: "Urgent", dot: "bg-rose-500",    color: "bg-rose-50    text-rose-700    dark:bg-rose-900/30   dark:text-rose-300"    },
}

export function PriorityBadge({ priority, showLabel = true, className }: PriorityBadgeProps) {
  const { label, dot, color } = priorityConfig[priority]
  if (!showLabel) {
    return <span className={cn("h-2.5 w-2.5 rounded-full shrink-0 block", dot, className)} title={label} />
  }
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
      color, className
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dot)} />
      <span>{label}</span>
    </span>
  )
}
