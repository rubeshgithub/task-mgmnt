import { cn } from "@/lib/utils"

interface TaskForStats {
  status: string
  priority: string
  deadline: string | Date
}

export type StatFilter = "all" | "in_progress" | "completed" | "overdue" | "urgent"

interface Stat {
  label: string
  value: number
  valueClass: string
  subLabel?: string
  filterType: StatFilter
}

const DONE = new Set(["completed", "reviewed"])
const ACTIVE = new Set(["assigned", "started", "in_progress"])

function buildStats(tasks: TaskForStats[]): Stat[] {
  const now = new Date()
  const total = tasks.length
  const completed = tasks.filter((t) => DONE.has(t.status)).length
  const inProgress = tasks.filter((t) => ACTIVE.has(t.status)).length
  const overdue = tasks.filter(
    (t) => !DONE.has(t.status) && new Date(t.deadline) < now
  ).length
  const urgent = tasks.filter(
    (t) => t.priority === "urgent" && !DONE.has(t.status)
  ).length
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0

  return [
    { label: "Total Tasks", value: total,      valueClass: "text-foreground",                                              filterType: "all",         subLabel: undefined },
    { label: "In Progress", value: inProgress, valueClass: "text-primary",                                                 filterType: "in_progress", subLabel: undefined },
    { label: "Completed",   value: completed,  valueClass: "text-emerald-600 dark:text-emerald-400",                       filterType: "completed",   subLabel: `${rate}% rate` },
    { label: "Overdue",     value: overdue,    valueClass: overdue > 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground", filterType: "overdue", subLabel: undefined },
    { label: "Urgent",      value: urgent,     valueClass: urgent > 0 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground", filterType: "urgent", subLabel: undefined },
  ]
}

interface StatsBarProps {
  tasks: TaskForStats[]
  activeFilter?: StatFilter | null
  onStatClick?: (type: StatFilter) => void
}

export function StatsBar({ tasks, activeFilter, onStatClick }: StatsBarProps) {
  const stats = buildStats(tasks)

  return (
    <div className="shrink-0 bg-card border-b grid grid-cols-5 divide-x">
      {stats.map(({ label, value, valueClass, subLabel, filterType }) => {
        const isActive = activeFilter === filterType || (filterType === "all" && !activeFilter)
        return (
          <button
            key={label}
            type="button"
            onClick={() => onStatClick?.(filterType)}
            className={cn(
              "px-3 sm:px-5 py-3 flex flex-col gap-0.5 text-left transition-colors",
              "hover:bg-muted/60",
              isActive && activeFilter !== null && "bg-primary/5 border-b-2 border-primary"
            )}
          >
            <span className={cn("text-xl sm:text-2xl font-bold tabular-nums leading-none", valueClass)}>
              {value}
            </span>
            <span className="text-[10px] sm:text-xs text-muted-foreground font-medium leading-tight truncate">
              {label}
            </span>
            {subLabel && (
              <span className="text-[10px] text-muted-foreground/70 leading-tight hidden sm:block">
                {subLabel}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
