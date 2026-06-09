import { useState } from "react"
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, isToday, format, addMonths, subMonths, isPast,
} from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TaskStatus } from "./StatusBadge"
import type { Priority } from "./PriorityBadge"

interface CalTask {
  id: string
  title: string
  priority: Priority
  status: TaskStatus
  deadline: Date
}

interface CalendarViewProps {
  tasks: CalTask[]
  selectedId: string | null
  onTaskClick: (id: string) => void
}

const priorityChip: Record<Priority, string> = {
  low:    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
  medium: "bg-blue-100    text-blue-800    dark:bg-blue-900/30    dark:text-blue-200",
  high:   "bg-orange-100  text-orange-800  dark:bg-orange-900/30  dark:text-orange-200",
  urgent: "bg-rose-100    text-rose-800    dark:bg-rose-900/30    dark:text-rose-200",
}

const DONE = new Set<TaskStatus>(["completed", "reviewed"])
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export function CalendarView({ tasks, selectedId, onTaskClick }: CalendarViewProps) {
  const [month, setMonth] = useState(new Date())

  const monthStart = startOfMonth(month)
  const monthEnd   = endOfMonth(month)
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd     = endOfWeek(monthEnd,   { weekStartsOn: 1 })
  const days       = eachDayOfInterval({ start: calStart, end: calEnd })

  // Build a lookup: "yyyy-MM-dd" → tasks
  const byDay = new Map<string, CalTask[]>()
  tasks.forEach((t) => {
    const key = format(t.deadline, "yyyy-MM-dd")
    if (!byDay.has(key)) byDay.set(key, [])
    byDay.get(key)!.push(t)
  })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Month navigation */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b bg-background">
        <button
          onClick={() => setMonth((m) => subMonths(m, 1))}
          className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">{format(month, "MMMM yyyy")}</span>
          <button
            onClick={() => setMonth(new Date())}
            className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            Today
          </button>
        </div>
        <button
          onClick={() => setMonth((m) => addMonths(m, 1))}
          className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="shrink-0 grid grid-cols-7 border-b bg-muted/30">
        {DAY_LABELS.map((d) => (
          <div key={d} className="py-1.5 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Grid — scrolls if needed */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7 border-l border-t">
          {days.map((day) => {
            const key      = format(day, "yyyy-MM-dd")
            const dayTasks = byDay.get(key) ?? []
            const inMonth  = isSameMonth(day, month)
            const today    = isToday(day)
            const overdue  = isPast(day) && !today && dayTasks.some((t) => !DONE.has(t.status))

            return (
              <div
                key={key}
                className={cn(
                  "min-h-[90px] border-b border-r p-1 flex flex-col gap-0.5",
                  !inMonth && "opacity-35 bg-muted/20",
                  today && "bg-primary/5",
                  overdue && inMonth && "bg-rose-50/40 dark:bg-rose-900/10"
                )}
              >
                {/* Date number */}
                <span className={cn(
                  "self-start inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-medium mb-0.5",
                  today ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                )}>
                  {format(day, "d")}
                </span>

                {/* Task chips */}
                {dayTasks.slice(0, 3).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onTaskClick(t.id)}
                    title={t.title}
                    className={cn(
                      "w-full text-left text-[10px] sm:text-xs px-1.5 py-0.5 rounded-md truncate font-medium leading-tight transition-all",
                      priorityChip[t.priority],
                      DONE.has(t.status) && "opacity-50 line-through",
                      selectedId === t.id && "ring-2 ring-primary ring-offset-1"
                    )}
                  >
                    {t.title}
                  </button>
                ))}
                {dayTasks.length > 3 && (
                  <span className="text-[10px] text-muted-foreground px-1">
                    +{dayTasks.length - 3} more
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
