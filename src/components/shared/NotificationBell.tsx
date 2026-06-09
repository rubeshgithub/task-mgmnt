import { useState, useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { remindersApi, tasksApi } from "@/services/api"
import { Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow, isPast } from "date-fns"
import { useNavigate } from "@tanstack/react-router"

const SEEN_KEY = "notif_seen_ids"

function getSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function persistSeen(ids: Set<string>) {
  localStorage.setItem(SEEN_KEY, JSON.stringify([...ids]))
}

interface NotifItem {
  id: string
  type: "reminder" | "overdue"
  title: string
  body: string
  to: "/reminders" | "/tasks"
}

const DONE_STATUSES = new Set(["completed", "reviewed"])

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState<Set<string>>(getSeenIds)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const { data: reminders = [] } = useQuery({
    queryKey: ["reminders"],
    queryFn: remindersApi.list,
    refetchInterval: 60_000,
  })

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: tasksApi.list,
    refetchInterval: 60_000,
  })

  const items: NotifItem[] = [
    ...reminders
      .filter((r) => r.reminded && r.status === "pending")
      .map((r) => ({
        id: `r_${r.id}`,
        type: "reminder" as const,
        title: r.title,
        body: r.remind_at
          ? `Due ${formatDistanceToNow(new Date(r.remind_at), { addSuffix: true })}`
          : "Reminder fired",
        to: "/reminders" as const,
      })),
    ...tasks
      .filter((t) => !DONE_STATUSES.has(t.status) && isPast(new Date(t.deadline)))
      .map((t) => ({
        id: `t_${t.id}`,
        type: "overdue" as const,
        title: t.title,
        body: `Overdue ${formatDistanceToNow(new Date(t.deadline), { addSuffix: true })}`,
        to: "/tasks" as const,
      })),
  ]

  const unreadCount = items.filter((n) => !seen.has(n.id)).length

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const handleToggle = () => {
    if (!open && unreadCount > 0) {
      const next = new Set(seen)
      items.forEach((n) => next.add(n.id))
      persistSeen(next)
      setSeen(next)
    }
    setOpen((v) => !v)
  }

  const handleClearAll = () => {
    const next = new Set(seen)
    items.forEach((n) => next.add(n.id))
    persistSeen(next)
    setSeen(next)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleToggle}
        className="relative h-8 w-8 flex items-center justify-center rounded-md border border-input bg-background hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[10px] font-bold text-white leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-80 max-h-[22rem] overflow-y-auto rounded-xl border bg-card shadow-lg z-50">
          <div className="sticky top-0 bg-card border-b px-3 py-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Notifications</span>
            {items.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">
              All clear — no notifications.
            </div>
          ) : (
            <div className="divide-y">
              {items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => { setOpen(false); navigate({ to: n.to }) }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors",
                    !seen.has(n.id) && "bg-primary/5"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 text-sm">
                      {n.type === "reminder" ? "🔔" : "⚠️"}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground">{n.body}</p>
                    </div>
                    {!seen.has(n.id) && (
                      <span className="shrink-0 mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
