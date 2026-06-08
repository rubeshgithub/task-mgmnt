import { Search, X, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import { UserAvatar } from "./UserAvatar"
import { cn } from "@/lib/utils"
import type { TaskStatus } from "./StatusBadge"
import type { Priority } from "./PriorityBadge"
import type { AuthUser } from "@/services/api"

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "assigned",    label: "Assigned"    },
  { value: "started",     label: "Started"     },
  { value: "in_progress", label: "In Progress" },
  { value: "completed",   label: "Completed"   },
  { value: "reviewed",    label: "Reviewed"    },
  { value: "on_hold",     label: "On Hold"     },
]

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "urgent", label: "Urgent" },
  { value: "high",   label: "High"   },
  { value: "medium", label: "Medium" },
  { value: "low",    label: "Low"    },
]

interface FilterBarProps {
  search: string
  onSearchChange: (v: string) => void
  statusFilter: Set<TaskStatus>
  onStatusToggle: (s: TaskStatus) => void
  priorityFilter: Set<Priority>
  onPriorityToggle: (p: Priority) => void
  assigneeFilter: Set<string>
  onAssigneeToggle: (id: string) => void
  users: AuthUser[]
  onClear: () => void
  resultCount: number
  totalCount: number
}

interface FilterButtonProps {
  label: string
  activeCount: number
  children: React.ReactNode
}

function FilterButton({ label, activeCount, children }: FilterButtonProps) {
  const active = activeCount > 0
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cn(
          "h-8 flex items-center gap-1.5 px-2.5 text-xs rounded-md border bg-background hover:bg-muted transition-colors whitespace-nowrap",
          active && "border-primary text-primary bg-primary/5"
        )}>
          {label}
          {active && (
            <span className="h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {activeCount}
            </span>
          )}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function FilterBar({
  search, onSearchChange,
  statusFilter, onStatusToggle,
  priorityFilter, onPriorityToggle,
  assigneeFilter, onAssigneeToggle,
  users,
  onClear,
  resultCount, totalCount,
}: FilterBarProps) {
  const hasFilters = search.length > 0 || statusFilter.size > 0 || priorityFilter.size > 0 || assigneeFilter.size > 0
  const isFiltered = hasFilters && resultCount !== totalCount

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b">
      {/* Search */}
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search tasks…"
          className="pl-8 h-8 text-sm"
        />
      </div>

      {/* Status filter */}
      <FilterButton label="Status" activeCount={statusFilter.size}>
        {STATUSES.map(({ value, label }) => (
          <DropdownMenuCheckboxItem
            key={value}
            checked={statusFilter.has(value)}
            onCheckedChange={() => onStatusToggle(value)}
          >
            {label}
          </DropdownMenuCheckboxItem>
        ))}
      </FilterButton>

      {/* Priority filter */}
      <FilterButton label="Priority" activeCount={priorityFilter.size}>
        {PRIORITIES.map(({ value, label }) => (
          <DropdownMenuCheckboxItem
            key={value}
            checked={priorityFilter.has(value)}
            onCheckedChange={() => onPriorityToggle(value)}
          >
            {label}
          </DropdownMenuCheckboxItem>
        ))}
      </FilterButton>

      {/* Assignee filter */}
      <FilterButton label="Assignee" activeCount={assigneeFilter.size}>
        {users.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">No members yet</div>
        ) : users.map((user) => (
          <DropdownMenuCheckboxItem
            key={user.id}
            checked={assigneeFilter.has(user.id)}
            onCheckedChange={() => onAssigneeToggle(user.id)}
          >
            <div className="flex items-center gap-2">
              <UserAvatar name={user.name} email={user.email} size="xs" />
              <span className="truncate">{user.name}</span>
            </div>
          </DropdownMenuCheckboxItem>
        ))}
      </FilterButton>

      {/* Result count + clear */}
      {isFiltered && (
        <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:block">
          {resultCount} of {totalCount}
        </span>
      )}
      {hasFilters && (
        <button
          onClick={onClear}
          className="h-8 w-8 flex items-center justify-center rounded-md border bg-background hover:bg-muted transition-colors text-muted-foreground shrink-0"
          aria-label="Clear filters"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
