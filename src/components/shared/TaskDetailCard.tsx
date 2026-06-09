import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { StatusBadge, type TaskStatus } from "./StatusBadge"
import { PriorityBadge, type Priority } from "./PriorityBadge"
import { UserAvatar } from "./UserAvatar"
import { DeadlineIndicator } from "./DeadlineIndicator"
import { TaskComments } from "./TaskComments"
import { TaskAttachments } from "./TaskAttachments"
import { formatDistanceToNow } from "date-fns"

export interface Assignee {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

interface TaskDetailCardProps {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: Priority
  deadline: Date
  assignedTo: Assignee[]
  createdBy: Assignee
  createdAt: Date
  progressPercentage: number
  tags?: string[]
  onStatusChange?: (newStatus: TaskStatus) => void
  onEdit?: () => void
  onDelete?: () => void
}

const STATUS_OPTIONS: TaskStatus[] = ["assigned", "started", "in_progress", "completed"]

export function TaskDetailCard({
  id, title, description, status, priority, deadline, assignedTo,
  createdBy, createdAt, progressPercentage, tags,
  onStatusChange, onEdit, onDelete,
}: TaskDetailCardProps) {
  return (
    <div className="space-y-3">

      {/* Title + actions */}
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold leading-snug flex-1">{title}</h2>
        <div className="flex gap-1.5 shrink-0">
          {onEdit && <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={onEdit}>Edit</Button>}
          {onDelete && <Button variant="destructive" size="sm" className="h-7 text-xs px-2" onClick={onDelete}>Delete</Button>}
        </div>
      </div>

      {/* Status + priority */}
      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge status={status} />
        <PriorityBadge priority={priority} />
      </div>

      <Separator />

      {/* Description */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Description</p>
        <p className="text-sm text-muted-foreground line-clamp-3">
          {description || "No description provided"}
        </p>
      </div>

      <Separator />

      {/* Deadline + created by — two columns */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Deadline</p>
          <DeadlineIndicator deadline={deadline} completed={status === "completed"} className="text-xs" />
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Created by</p>
          <div className="flex items-center gap-1.5">
            <UserAvatar name={createdBy.name} email={createdBy.email} size="xs" />
            <span className="text-xs truncate">{createdBy.name}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatDistanceToNow(createdAt, { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Progress */}
      {progressPercentage > 0 && (
        <>
          <Separator />
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Progress</p>
              <span className="text-xs font-medium">{progressPercentage}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${progressPercentage}%` }} />
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* Assignees — compact avatar row */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Assignees ({assignedTo.length})
        </p>
        <div className="flex flex-wrap gap-2">
          {assignedTo.map((a) => (
            <div key={a.id} className="flex items-center gap-1.5">
              <UserAvatar name={a.name} email={a.email} avatarUrl={a.avatarUrl} size="xs" />
              <span className="text-xs">{a.name.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tags */}
      {tags && tags.length > 0 && (
        <>
          <Separator />
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs px-2 py-0">{tag}</Badge>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Status change */}
      {onStatusChange && (
        <>
          <Separator />
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Change Status</p>
            <div className="grid grid-cols-4 gap-1.5">
              {STATUS_OPTIONS.map((s) => (
                <Button
                  key={s}
                  variant={s === status ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-7 px-1.5 capitalize"
                  onClick={() => onStatusChange(s)}
                >
                  {s.replace("_", " ")}
                </Button>
              ))}
            </div>
          </div>
        </>
      )}

      <Separator />
      <TaskAttachments taskId={id} />

      <Separator />
      <TaskComments taskId={id} />
    </div>
  )
}
