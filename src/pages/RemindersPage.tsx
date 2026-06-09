import { useState, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { remindersApi, type Reminder } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/context/AuthContext"
import { useNavigate } from "@tanstack/react-router"
import { useTheme } from "@/hooks/use-theme"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { cn } from "@/lib/utils"
import {
  Plus, Sun, Moon, LogOut, Settings, CheckCircle2, Circle,
  Clock, Pencil, X, Bell, BellOff,
} from "lucide-react"
import { format, isPast } from "date-fns"

// ── Category config ───────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "personal", label: "Personal", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
  { value: "work",     label: "Work",     color: "bg-blue-100   text-blue-700   dark:bg-blue-900/40   dark:text-blue-300"   },
  { value: "health",   label: "Health",   color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  { value: "other",    label: "Other",    color: "bg-slate-100  text-slate-600  dark:bg-slate-800     dark:text-slate-300"  },
]

function CategoryBadge({ category }: { category: string }) {
  const cfg = CATEGORIES.find((c) => c.value === category) ?? CATEGORIES[3]
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", cfg.color)}>
      {cfg.label}
    </span>
  )
}

// ── Reminder item ─────────────────────────────────────────────────────────────

interface ReminderItemProps {
  reminder: Reminder
  onToggle: () => void
  onCancel: () => void
  onDelete: () => void
  onEdit: () => void
}

function ReminderItem({ reminder, onToggle, onCancel, onDelete, onEdit }: ReminderItemProps) {
  const done = reminder.status !== "pending"
  const hasDate = !!reminder.remind_at
  const dateObj = hasDate ? new Date(reminder.remind_at!) : null
  const overdue = dateObj && isPast(dateObj) && reminder.status === "pending"

  return (
    <div className={cn(
      "group flex items-start gap-3 px-4 py-3 rounded-xl border bg-card transition-all",
      done && "opacity-50"
    )}>
      {/* Status toggle */}
      <button
        onClick={onToggle}
        className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
        aria-label={done ? "Mark pending" : "Mark completed"}
      >
        {reminder.status === "completed"
          ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          : reminder.status === "cancelled"
          ? <X className="h-5 w-5 text-rose-400" />
          : <Circle className="h-5 w-5" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium leading-snug", done && "line-through text-muted-foreground")}>
          {reminder.title}
        </p>
        {reminder.description && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{reminder.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <CategoryBadge category={reminder.category} />
          {dateObj && (
            <span className={cn(
              "inline-flex items-center gap-1 text-xs",
              overdue ? "text-rose-500 font-medium" : "text-muted-foreground"
            )}>
              {overdue ? <Bell className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              {format(dateObj, "MMM d, yyyy h:mm a")}
            </span>
          )}
          {reminder.reminded && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/60">
              <BellOff className="h-3 w-3" /> Notified
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {!done && (
          <button onClick={onEdit} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground" aria-label="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        {reminder.status === "pending" ? (
          <button onClick={onCancel} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground" aria-label="Cancel">
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button onClick={onDelete} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive" aria-label="Delete">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Edit dialog ───────────────────────────────────────────────────────────────

interface EditDialogProps {
  reminder: Reminder | null
  onClose: () => void
  onSave: (data: { title: string; description: string; category: string; remind_at: string | null }) => Promise<void>
  isLoading: boolean
}

function EditDialog({ reminder, onClose, onSave, isLoading }: EditDialogProps) {
  const [title, setTitle] = useState(reminder?.title ?? "")
  const [description, setDescription] = useState(reminder?.description ?? "")
  const [category, setCategory] = useState(reminder?.category ?? "personal")
  const [remindAt, setRemindAt] = useState(
    reminder?.remind_at ? new Date(reminder.remind_at).toISOString().slice(0, 16) : ""
  )

  const handleSave = async () => {
    if (!title.trim()) return
    await onSave({
      title: title.trim(),
      description: description.trim(),
      category,
      remind_at: remindAt ? new Date(remindAt).toISOString() : null,
    })
  }

  return (
    <Dialog open={!!reminder} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-[460px] rounded-lg">
        <DialogHeader>
          <DialogTitle>Edit Reminder</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What do you want to remember?"
            disabled={isLoading}
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Details (optional)"
            rows={2}
            disabled={isLoading}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
              <Select value={category} onValueChange={setCategory} disabled={isLoading}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Remind at</label>
              <Input
                type="datetime-local"
                value={remindAt}
                onChange={(e) => setRemindAt(e.target.value)}
                disabled={isLoading}
                className="text-xs"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleSave} disabled={isLoading || !title.trim()}>
            {isLoading ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function RemindersPage() {
  const [quickTitle, setQuickTitle] = useState("")
  const [quickCategory, setQuickCategory] = useState("personal")
  const [quickDate, setQuickDate] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [showDone, setShowDone] = useState(false)
  const [editTarget, setEditTarget] = useState<Reminder | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { toast } = useToast()
  const qc = useQueryClient()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { theme, toggle: toggleTheme } = useTheme()

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ["reminders"],
    queryFn: remindersApi.list,
  })

  const createMutation = useMutation({
    mutationFn: remindersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminders"] })
      setQuickTitle("")
      setQuickDate("")
      inputRef.current?.focus()
    },
    onError: (e: Error) => toast({ title: "Failed to add reminder", description: e.message, variant: "destructive" }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof remindersApi.update>[1] }) =>
      remindersApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminders"] })
      setEditTarget(null)
    },
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  })

  const deleteMutation = useMutation({
    mutationFn: remindersApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
    onError: (e: Error) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  })

  const handleQuickAdd = () => {
    if (!quickTitle.trim()) return
    createMutation.mutate({
      title: quickTitle.trim(),
      category: quickCategory,
      remind_at: quickDate ? new Date(quickDate).toISOString() : null,
    })
  }

  const handleToggle = (r: Reminder) => {
    if (r.status === "completed") {
      updateMutation.mutate({ id: r.id, data: { status: "pending" } })
    } else {
      updateMutation.mutate({ id: r.id, data: { status: "completed" } })
    }
  }

  // Sort: pending first, then by created_at desc
  const sorted = [...reminders].sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1
    if (a.status !== "pending" && b.status === "pending") return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const filtered = sorted.filter((r) => {
    if (categoryFilter !== "all" && r.category !== categoryFilter) return false
    return true
  })

  const pending = filtered.filter((r) => r.status === "pending")
  const done = filtered.filter((r) => r.status !== "pending")

  if (isLoading) return <LoadingSpinner message="Loading reminders..." className="min-h-screen" />

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="bg-card border-b px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg font-bold leading-tight">{user?.org_name || "Task Management"}</h1>
          </div>
          {/* Nav tabs */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => navigate({ to: "/tasks" })}
              className="px-3 py-1 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground transition-colors"
            >
              Tasks
            </button>
            <button
              className="px-3 py-1 text-xs font-medium rounded-md bg-background text-foreground shadow-sm"
            >
              Reminders
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user && <span className="hidden sm:block text-xs text-muted-foreground">{user.name}</span>}
          <button onClick={toggleTheme} className="h-8 w-8 flex items-center justify-center rounded-md border border-input bg-background hover:bg-muted transition-colors" aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
          </button>
          <button onClick={() => navigate({ to: "/settings" })} className="h-8 w-8 flex items-center justify-center rounded-md border border-input bg-background hover:bg-muted transition-colors" aria-label="Settings">
            <Settings className="h-4 w-4 text-muted-foreground" />
          </button>
          <button onClick={() => { logout(); navigate({ to: "/login" }) }} className="h-8 w-8 flex items-center justify-center rounded-md border border-input bg-background hover:bg-muted transition-colors" aria-label="Sign out">
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Quick-add */}
      <div className="shrink-0 bg-card border-b px-4 py-3">
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <Input
            ref={inputRef}
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleQuickAdd() }}
            placeholder="What do you want to remember? Press Enter to add…"
            className="flex-1 min-w-0"
            disabled={createMutation.isPending}
          />
          <Select value={quickCategory} onValueChange={setQuickCategory}>
            <SelectTrigger className="w-32 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            type="datetime-local"
            value={quickDate}
            onChange={(e) => setQuickDate(e.target.value)}
            className="w-44 shrink-0 text-xs"
            disabled={createMutation.isPending}
          />
          <Button onClick={handleQuickAdd} disabled={createMutation.isPending || !quickTitle.trim()} className="shrink-0">
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {/* Category filter */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b overflow-x-auto bg-background">
        {[{ value: "all", label: "All" }, ...CATEGORIES].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setCategoryFilter(value)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
              categoryFilter === value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-2">

          {/* Pending */}
          {pending.length === 0 && done.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">
              <p className="text-2xl mb-2">🔔</p>
              <p>No reminders yet. Add one above.</p>
            </div>
          )}
          {pending.length === 0 && done.length > 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">All caught up! No pending reminders.</p>
          )}

          {pending.map((r) => (
            <ReminderItem
              key={r.id}
              reminder={r}
              onToggle={() => handleToggle(r)}
              onCancel={() => updateMutation.mutate({ id: r.id, data: { status: "cancelled" } })}
              onDelete={() => deleteMutation.mutate(r.id)}
              onEdit={() => setEditTarget(r)}
            />
          ))}

          {/* Done section */}
          {done.length > 0 && (
            <div className="pt-2">
              <button
                onClick={() => setShowDone((v) => !v)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
              >
                <span className={cn("transition-transform", showDone && "rotate-90")}>▶</span>
                {showDone ? "Hide" : "Show"} completed & cancelled ({done.length})
              </button>
              {showDone && done.map((r) => (
                <ReminderItem
                  key={r.id}
                  reminder={r}
                  onToggle={() => handleToggle(r)}
                  onCancel={() => updateMutation.mutate({ id: r.id, data: { status: "cancelled" } })}
                  onDelete={() => deleteMutation.mutate(r.id)}
                  onEdit={() => setEditTarget(r)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit dialog */}
      <EditDialog
        reminder={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={(data) => updateMutation.mutateAsync({ id: editTarget!.id, data })}
        isLoading={updateMutation.isPending}
      />
    </div>
  )
}
