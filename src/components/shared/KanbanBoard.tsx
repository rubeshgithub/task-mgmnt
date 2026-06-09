import { cn } from "@/lib/utils"
import { PriorityBadge, type Priority } from "./PriorityBadge"
import { DeadlineIndicator } from "./DeadlineIndicator"
import { UserAvatar } from "./UserAvatar"
import type { TaskStatus } from "./StatusBadge"
import type { Assignee } from "./TaskCard"
import { MessageSquare, Paperclip } from "lucide-react"

const priorityBorder: Record<Priority, string> = {
  low:    "border-l-emerald-500",
  medium: "border-l-blue-500",
  high:   "border-l-orange-500",
  urgent: "border-l-rose-500",
}

const COLUMNS: { status: TaskStatus; label: string; dot: string; header: string }[] = [
  { status: "assigned",    label: "Assigned",    dot: "bg-slate-400",   header: "bg-slate-100 dark:bg-slate-800/60" },
  { status: "started",     label: "Started",     dot: "bg-blue-400",    header: "bg-blue-50 dark:bg-blue-900/30" },
  { status: "in_progress", label: "In Progress", dot: "bg-indigo-400",  header: "bg-indigo-50 dark:bg-indigo-900/30" },
  { status: "on_hold",     label: "On Hold",     dot: "bg-rose-400",    header: "bg-rose-50 dark:bg-rose-900/30" },
  { status: "completed",   label: "Completed",   dot: "bg-emerald-400", header: "bg-emerald-50 dark:bg-emerald-900/30" },
  { status: "reviewed",    label: "Reviewed",    dot: "bg-cyan-400",    header: "bg-cyan-50 dark:bg-cyan-900/30" },
]

export interface KanbanTask {
  id: string
  title: string
  status: TaskStatus
  priority: Priority
  deadline: Date
  assignedTo: Assignee[]
  comment_count?: number
  attachment_count?: number
}

interface KanbanBoardProps {
  tasks: KanbanTask[]
  selectedId: string | null
  onTaskClick: (id: string) => void
}

function KanbanCard({
  task, isSelected, onClick,
}: { task: KanbanTask; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left bg-card rounded-lg border border-l-4 p-3 flex flex-col gap-2",
        "hover:shadow-md transition-all duration-150",
        priorityBorder[task.priority],
        isSelected && "ring-2 ring-primary/40 bg-primary/[0.03]"
      )}
    >
      <p className="text-xs font-semibold leading-snug line-clamp-3 text-foreground">{task.title}</p>
      <PriorityBadge priority={task.priority} />
      <div className="flex items-center justify-between gap-1">
        <DeadlineIndicator
          deadline={task.deadline}
          completed={task.status === "completed"}
          className="text-[10px]"
        />
        <div className="flex -space-x-1.5 shrink-0">
          {task.assignedTo.slice(0, 2).map((a) => (
            <UserAvatar key={a.id} name={a.name} email={a.email} size="xs" />
          ))}
          {task.assignedTo.length > 2 && (
            <div className="h-5 w-5 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[9px] font-bold">
              +{task.assignedTo.length - 2}
            </div>
          )}
        </div>
      </div>
      {((task.comment_count ?? 0) > 0 || (task.attachment_count ?? 0) > 0) && (
        <div className="flex items-center gap-2">
          {(task.comment_count ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/70">
              <MessageSquare className="h-3 w-3" />{task.comment_count}
            </span>
          )}
          {(task.attachment_count ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/70">
              <Paperclip className="h-3 w-3" />{task.attachment_count}
            </span>
          )}
        </div>
      )}
    </button>
  )
}

export function KanbanBoard({ tasks, selectedId, onTaskClick }: KanbanBoardProps) {
  const byStatus: Record<string, KanbanTask[]> = {}
  for (const col of COLUMNS) byStatus[col.status] = []
  for (const task of tasks) {
    if (byStatus[task.status]) byStatus[task.status].push(task)
  }

  return (
    <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden">
      <div className="flex gap-3 p-3 h-full" style={{ minWidth: "max-content" }}>
        {COLUMNS.map(({ status, label, dot, header }) => {
          const col = byStatus[status] ?? []
          return (
            <div
              key={status}
              className="w-64 shrink-0 flex flex-col rounded-xl border bg-muted/30 overflow-hidden"
            >
              <div className={cn("px-3 py-2.5 flex items-center gap-2 shrink-0 border-b", header)}>
                <span className={cn("h-2 w-2 rounded-full shrink-0", dot)} />
                <span className="text-xs font-semibold text-foreground">{label}</span>
                <span className="ml-auto text-xs font-bold text-muted-foreground tabular-nums">
                  {col.length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {col.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground/40 text-center py-6">No tasks</p>
                ) : col.map((task) => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    isSelected={selectedId === task.id}
                    onClick={() => onTaskClick(task.id)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
