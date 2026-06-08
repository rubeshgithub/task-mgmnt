import { cn } from "@/lib/utils"

interface TaskForStats {
  status: string
  priority: string
  deadline: string | Date
}

interface Stat {
  label: string
  value: number
  valueClass: string
  subLabel?: string
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
    {
      label: "Total Tasks",
      value: total,
      valueClass: "text-foreground",
    },
    {
      label: "In Progress",
      value: inProgress,
      valueClass: "text-primary",
    },
    {
      label: "Completed",
      value: completed,
      valueClass: "text-emerald-600 dark:text-emerald-400",
      subLabel: `${rate}% rate`,
    },
    {
      label: "Overdue",
      value: overdue,
      valueClass: overdue > 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground",
    },
    {
      label: "Urgent",
      value: urgent,
      valueClass: urgent > 0 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground",
    },
  ]
}

interface StatsBarProps {
  tasks: TaskForStats[]
}

export function StatsBar({ tasks }: StatsBarProps) {
  const stats = buildStats(tasks)

  return (
    <div className="shrink-0 bg-card border-b grid grid-cols-5 divide-x">
      {stats.map(({ label, value, valueClass, subLabel }) => (
        <div key={label} className="px-3 sm:px-5 py-3 flex flex-col gap-0.5">
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
        </div>
      ))}
    </div>
  )
}
