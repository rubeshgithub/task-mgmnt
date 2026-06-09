import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { X, ChevronDown, Trash2 } from "lucide-react"
import type { TaskStatus } from "./StatusBadge"
import type { Priority } from "./PriorityBadge"

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "assigned",   label: "Assigned" },
  { value: "started",    label: "Started" },
  { value: "in_progress",label: "In Progress" },
  { value: "on_hold",    label: "On Hold" },
  { value: "completed",  label: "Completed" },
  { value: "reviewed",   label: "Reviewed" },
]

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "low",    label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high",   label: "High" },
  { value: "urgent", label: "Urgent" },
]

interface BulkActionBarProps {
  count: number
  onStatusChange: (status: TaskStatus) => void
  onPriorityChange: (priority: Priority) => void
  onDelete: () => void
  onClear: () => void
}

export function BulkActionBar({ count, onStatusChange, onPriorityChange, onDelete, onClear }: BulkActionBarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-card border shadow-xl rounded-full px-4 py-2.5 animate-in slide-in-from-bottom-2 duration-200">
      <span className="text-sm font-semibold whitespace-nowrap">
        {count} selected
      </span>

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Status */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 rounded-full">
            Set Status <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" side="top" className="mb-1">
          {STATUS_OPTIONS.map((s) => (
            <DropdownMenuItem key={s.value} onClick={() => onStatusChange(s.value)}>
              {s.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Priority */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 rounded-full">
            Set Priority <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" side="top" className="mb-1">
          {PRIORITY_OPTIONS.map((p) => (
            <DropdownMenuItem key={p.value} onClick={() => onPriorityChange(p.value)}>
              {p.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Delete */}
      <Button
        variant="destructive"
        size="sm"
        className="h-7 text-xs gap-1 rounded-full"
        onClick={onDelete}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </Button>

      {/* Clear selection */}
      <button
        onClick={onClear}
        className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors ml-1"
        aria-label="Clear selection"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
