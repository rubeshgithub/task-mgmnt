import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { TaskCard, TASK_GRID } from "@/components/shared/TaskCard"
import { TaskGridCard } from "@/components/shared/TaskGridCard"
import { KanbanBoard } from "@/components/shared/KanbanBoard"
import { CalendarView } from "@/components/shared/CalendarView"
import { BulkActionBar } from "@/components/shared/BulkActionBar"
import { TaskDetailCard } from "@/components/shared/TaskDetailCard"
import { CreateTaskForm, type CreateTaskFormData } from "@/components/forms/CreateTaskForm"
import { EditTaskForm, type EditTaskFormData } from "@/components/forms/EditTaskForm"
import { EmptyState } from "@/components/shared/EmptyState"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import type { TaskStatus } from "@/components/shared/StatusBadge"
import type { Priority } from "@/components/shared/PriorityBadge"
import { tasksApi, authApi, type Task as ApiTask } from "@/services/api"
import { FilterBar } from "@/components/shared/FilterBar"
import { StatsBar, type StatFilter } from "@/components/shared/StatsBar"
import { cn } from "@/lib/utils"
import {
  Plus, X, ArrowLeft, Sun, Moon, LogOut, Settings,
  LayoutGrid, List, LayoutDashboard, CalendarDays, CheckSquare, Check,
  ArrowUp, ArrowDown, ArrowUpDown,
} from "lucide-react"
import { useTheme } from "@/hooks/use-theme"
import { useAuth } from "@/context/AuthContext"
import { useNavigate } from "@tanstack/react-router"
import { NotificationBell } from "@/components/shared/NotificationBell"

type ViewMode = "list" | "grid" | "kanban" | "calendar"
type SortBy = "title" | "deadline" | "priority" | "status"

const DONE = new Set<TaskStatus>(["completed", "reviewed"])

function toTask(t: ApiTask) {
  return {
    ...t,
    status: t.status as TaskStatus,
    priority: t.priority as Priority,
    deadline: new Date(t.deadline),
    createdAt: new Date(t.created_at),
    assignedTo: t.assigned_to,
    createdBy: t.created_by,
    progressPercentage: t.progress_percentage,
  }
}

export function TasksPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set())
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<Set<TaskStatus>>(new Set())
  const [priorityFilter, setPriorityFilter] = useState<Set<Priority>>(new Set())
  const [assigneeFilter, setAssigneeFilter] = useState<Set<string>>(new Set())
  const [overdueFilter, setOverdueFilter] = useState(false)
  const [activeStatFilter, setActiveStatFilter] = useState<StatFilter | null>(null)
  const [sortBy, setSortBy] = useState<SortBy | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const { toast } = useToast()
  const qc = useQueryClient()
  const { theme, toggle: toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate({ to: "/login" })
  }

  const { data: rawTasks = [], isLoading, isError } = useQuery({
    queryKey: ["tasks"],
    queryFn: tasksApi.list,
  })

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: authApi.listUsers,
  })

  const tasks = rawTasks.map(toTask)

  const filteredTasks = tasks.filter((t) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter.size > 0 && !statusFilter.has(t.status)) return false
    if (priorityFilter.size > 0 && !priorityFilter.has(t.priority)) return false
    if (assigneeFilter.size > 0 && !t.assignedTo.some((a) => assigneeFilter.has(a.id))) return false
    if (overdueFilter) {
      if (DONE.has(t.status)) return false
      if (t.deadline >= new Date()) return false
    }
    return true
  })

  const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
  const STATUS_ORDER: Record<string, number> = { assigned: 0, started: 1, in_progress: 2, on_hold: 3, completed: 4, reviewed: 5 }

  const toggleSort = (col: SortBy) => {
    if (sortBy === col) setSortDir((d) => d === "asc" ? "desc" : "asc")
    else { setSortBy(col); setSortDir("asc") }
  }

  const sortedTasks = sortBy ? [...filteredTasks].sort((a, b) => {
    let cmp = 0
    if (sortBy === "title") cmp = a.title.localeCompare(b.title)
    else if (sortBy === "deadline") cmp = a.deadline.getTime() - b.deadline.getTime()
    else if (sortBy === "priority") cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    else if (sortBy === "status") cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    return sortDir === "asc" ? cmp : -cmp
  }) : filteredTasks

  const toggleStatus = (s: TaskStatus) =>
    setStatusFilter((prev) => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n })

  const togglePriority = (p: Priority) =>
    setPriorityFilter((prev) => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n })

  const toggleAssignee = (id: string) =>
    setAssigneeFilter((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const clearFilters = () => {
    setSearch("")
    setStatusFilter(new Set())
    setPriorityFilter(new Set())
    setAssigneeFilter(new Set())
    setOverdueFilter(false)
    setActiveStatFilter(null)
  }

  const toggleBulkSelect = (id: string) => {
    setBulkSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const exitBulkMode = () => {
    setBulkMode(false)
    setBulkSelected(new Set())
  }

  const handleBulkStatusChange = async (newStatus: TaskStatus) => {
    await Promise.all([...bulkSelected].map((id) => tasksApi.update(id, { status: newStatus })))
    qc.invalidateQueries({ queryKey: ["tasks"] })
    toast({ title: `${bulkSelected.size} tasks updated to "${newStatus.replace("_", " ")}"` })
    exitBulkMode()
  }

  const handleBulkPriorityChange = async (priority: string) => {
    await Promise.all([...bulkSelected].map((id) => tasksApi.update(id, { priority })))
    qc.invalidateQueries({ queryKey: ["tasks"] })
    toast({ title: `${bulkSelected.size} tasks updated` })
    exitBulkMode()
  }

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${bulkSelected.size} task${bulkSelected.size > 1 ? "s" : ""}? This cannot be undone.`)) return
    await Promise.all([...bulkSelected].map((id) => tasksApi.delete(id)))
    qc.invalidateQueries({ queryKey: ["tasks"] })
    toast({ title: `${bulkSelected.size} tasks deleted`, variant: "destructive" })
    exitBulkMode()
  }

  const handleStatClick = (type: StatFilter) => {
    setSearch("")
    setStatusFilter(new Set())
    setPriorityFilter(new Set())
    setAssigneeFilter(new Set())
    setOverdueFilter(false)
    if (type === "all") {
      setActiveStatFilter(null)
      return
    }
    setActiveStatFilter(type)
    if (type === "in_progress") setStatusFilter(new Set(["assigned", "started", "in_progress"]))
    else if (type === "completed") setStatusFilter(new Set(["completed", "reviewed"]))
    else if (type === "overdue") setOverdueFilter(true)
    else if (type === "urgent") setPriorityFilter(new Set(["urgent"]))
  }

  const selectedTask = tasks.find((t) => t.id === selectedId) ?? null

  const canManageTask = (task: ReturnType<typeof toTask>) => {
    if (!user) return false
    if (user.role === "owner" || user.role === "admin") return true
    return task.createdBy.id === user.id
  }

  const createMutation = useMutation({
    mutationFn: tasksApi.create,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["tasks"] })
      toast({ title: "Task created", description: `"${created.title}" has been added.` })
    },
    onError: (e: Error) => toast({ title: "Failed to create task", description: e.message, variant: "destructive" }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof tasksApi.update>[1] }) =>
      tasksApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  })

  const handleEditTask = async (data: EditTaskFormData) => {
    if (!selectedId) return
    await updateMutation.mutateAsync({
      id: selectedId,
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
        deadline: new Date(data.deadline).toISOString(),
      },
    })
    toast({ title: "Task updated" })
  }

  const deleteMutation = useMutation({
    mutationFn: tasksApi.delete,
    onSuccess: () => {
      setSelectedId(null)
      qc.invalidateQueries({ queryKey: ["tasks"] })
      toast({ title: "Task deleted", variant: "destructive" })
    },
    onError: (e: Error) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  })

  const handleCreateTask = async (data: CreateTaskFormData) => {
    await createMutation.mutateAsync({
      title: data.title,
      description: data.description ?? "",
      priority: data.priority,
      deadline: new Date(data.deadline).toISOString(),
      assigned_to: data.assignedTo.length > 0 ? data.assignedTo : undefined,
    })
  }

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    updateMutation.mutate({ id: taskId, data: { status: newStatus } })
    toast({ title: "Status updated", description: `Moved to "${newStatus.replace("_", " ")}".` })
  }

  const handleTaskClick = (id: string) =>
    setSelectedId((prev) => (prev === id ? null : id))

  if (isLoading) return <LoadingSpinner message="Loading tasks..." className="min-h-screen" />
  if (isError) return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
      Failed to load tasks — is the backend running?
    </div>
  )

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="bg-card border-b px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold leading-tight">{user?.org_name || "Task Management"}</h1>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <button className="px-3 py-1 text-xs font-medium rounded-md bg-background text-foreground shadow-sm">
              Tasks
            </button>
            <button
              onClick={() => navigate({ to: "/reminders" })}
              className="px-3 py-1 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground transition-colors"
            >
              Reminders
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <span className="hidden sm:block text-xs text-muted-foreground">{user.name}</span>
          )}
          <NotificationBell />
          <button
            onClick={toggleTheme}
            className="h-8 w-8 flex items-center justify-center rounded-md border border-input bg-background hover:bg-muted transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark"
              ? <Sun className="h-4 w-4 text-muted-foreground" />
              : <Moon className="h-4 w-4 text-muted-foreground" />}
          </button>
          <button
            onClick={() => navigate({ to: "/settings" })}
            className="h-8 w-8 flex items-center justify-center rounded-md border border-input bg-background hover:bg-muted transition-colors"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={handleLogout}
            className="h-8 w-8 flex items-center justify-center rounded-md border border-input bg-background hover:bg-muted transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </button>
          <Button size="sm" onClick={() => setIsCreateOpen(true)} disabled={createMutation.isPending}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Task
          </Button>
        </div>
      </header>

      {/* Stats — clickable */}
      <StatsBar tasks={tasks} activeFilter={activeStatFilter} onStatClick={handleStatClick} />

      {/* Body */}
      <div className="flex flex-1 min-h-0">

        {/* Task list / grid / kanban area */}
        <div className={cn(
          "flex flex-col min-h-0 transition-all w-full",
          selectedTask && "md:w-[55%] lg:w-3/5",
          viewMode !== "kanban" && viewMode !== "calendar" && "overflow-y-auto"
        )}>
          {tasks.length === 0 ? (
            <EmptyState
              title="No tasks yet"
              description="Create your first task to get started"
              icon="🎯"
              action={{ label: "Create Task", onClick: () => setIsCreateOpen(true) }}
            />
          ) : (
            <>
              {/* Sticky filter + column header bar */}
              <div className="sticky top-0 z-10 bg-background shrink-0">
                <FilterBar
                  search={search}
                  onSearchChange={(v) => { setSearch(v); setActiveStatFilter(null) }}
                  statusFilter={statusFilter}
                  onStatusToggle={(s) => { toggleStatus(s); setActiveStatFilter(null) }}
                  priorityFilter={priorityFilter}
                  onPriorityToggle={(p) => { togglePriority(p); setActiveStatFilter(null) }}
                  assigneeFilter={assigneeFilter}
                  onAssigneeToggle={(id) => { toggleAssignee(id); setActiveStatFilter(null) }}
                  users={users}
                  onClear={clearFilters}
                  resultCount={filteredTasks.length}
                  totalCount={tasks.length}
                  trailing={
                    <>
                      {(["list", "grid", "kanban", "calendar"] as ViewMode[]).map((mode) => {
                        const Icon = mode === "list" ? List : mode === "grid" ? LayoutGrid : mode === "kanban" ? LayoutDashboard : CalendarDays
                        return (
                          <button
                            key={mode}
                            onClick={() => { setViewMode(mode); exitBulkMode() }}
                            aria-label={`${mode} view`}
                            className={cn(
                              "h-7 w-7 flex items-center justify-center rounded-md transition-colors",
                              viewMode === mode
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-muted"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </button>
                        )
                      })}
                      {(viewMode === "list" || viewMode === "grid") && (
                        <button
                          onClick={() => { if (bulkMode) exitBulkMode(); else setBulkMode(true) }}
                          aria-label="Select mode"
                          className={cn(
                            "h-7 w-7 flex items-center justify-center rounded-md transition-colors ml-1",
                            bulkMode
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-muted"
                          )}
                          title="Select tasks for bulk actions"
                        >
                          <CheckSquare className="h-4 w-4" />
                        </button>
                      )}
                    </>
                  }
                />

                {/* Column headers — list view only, full-width so grid aligns with cards */}
                {viewMode === "list" && (
                  <div className="bg-background border-b px-7 py-1.5">
                    <div className={cn(
                      "grid items-center gap-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide",
                      TASK_GRID
                    )}>
                      <button
                        onClick={() => toggleSort("priority")}
                        className={cn("flex items-center justify-center gap-0.5 hover:text-foreground transition-colors", sortBy === "priority" && "text-foreground")}
                      >
                        Pri
                        {sortBy === "priority" ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </button>
                      <button
                        onClick={() => toggleSort("title")}
                        className={cn("flex items-center gap-0.5 hover:text-foreground transition-colors", sortBy === "title" && "text-foreground")}
                      >
                        Title
                        {sortBy === "title" ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </button>
                      <button
                        onClick={() => toggleSort("status")}
                        className={cn("flex items-center gap-0.5 hover:text-foreground transition-colors", sortBy === "status" && "text-foreground")}
                      >
                        Status
                        {sortBy === "status" ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </button>
                      <button
                        onClick={() => toggleSort("deadline")}
                        className={cn("hidden md:flex items-center gap-0.5 hover:text-foreground transition-colors", sortBy === "deadline" && "text-foreground")}
                      >
                        Deadline
                        {sortBy === "deadline" ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </button>
                      <span className="hidden lg:block text-right">Assignees</span>
                      <span />
                    </div>
                  </div>
                )}
              </div>

              {/* Content */}
              {viewMode === "kanban" ? (
                <KanbanBoard
                  tasks={sortedTasks}
                  selectedId={selectedId}
                  onTaskClick={handleTaskClick}
                />
              ) : viewMode === "calendar" ? (
                <CalendarView
                  tasks={sortedTasks}
                  selectedId={selectedId}
                  onTaskClick={handleTaskClick}
                />
              ) : filteredTasks.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No tasks match your filters
                </div>
              ) : viewMode === "grid" ? (
                <div className={cn(
                  "p-3 sm:p-4 grid gap-3",
                  selectedTask
                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2"
                    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                )}>
                  {sortedTasks.map((task) => (
                    <div key={task.id} className="relative">
                      <TaskGridCard
                        {...task}
                        isSelected={bulkMode ? bulkSelected.has(task.id) : selectedId === task.id}
                        onTaskClick={bulkMode ? () => toggleBulkSelect(task.id) : handleTaskClick}
                      />
                      {bulkMode && (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleBulkSelect(task.id) }}
                          className={cn(
                            "absolute top-2 right-2 h-5 w-5 rounded border-2 bg-background flex items-center justify-center transition-colors",
                            bulkSelected.has(task.id) ? "bg-primary border-primary text-primary-foreground" : "border-input"
                          )}
                        >
                          {bulkSelected.has(task.id) && <Check className="h-3 w-3" />}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 space-y-1">
                  {sortedTasks.map((task) => (
                    <div key={task.id} className="relative flex items-center">
                      {bulkMode && (
                        <button
                          onClick={() => toggleBulkSelect(task.id)}
                          className={cn(
                            "absolute left-2 top-1/2 -translate-y-1/2 z-10 h-4 w-4 rounded border-2 bg-background flex items-center justify-center transition-colors",
                            bulkSelected.has(task.id) ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"
                          )}
                        >
                          {bulkSelected.has(task.id) && <Check className="h-2.5 w-2.5" />}
                        </button>
                      )}
                      <div className={cn("flex-1", bulkMode && "pl-8")}>
                        <TaskCard
                          {...task}
                          isSelected={!bulkMode && selectedId === task.id}
                          onTaskClick={bulkMode ? () => toggleBulkSelect(task.id) : handleTaskClick}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Detail panel */}
        {selectedTask && (
          <div className={cn(
            "bg-card flex flex-col overflow-hidden",
            "fixed inset-0 z-20",
            "md:relative md:inset-auto md:z-auto md:border-l md:w-[45%] lg:w-2/5"
          )}>
            <div className="border-b px-4 py-2 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedId(null)}
                  className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Back to tasks"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <span className="text-xs text-muted-foreground font-medium">Task Detail</span>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <TaskDetailCard
                {...selectedTask}
                onStatusChange={(s) => handleStatusChange(selectedTask.id, s)}
                onEdit={canManageTask(selectedTask) ? () => setIsEditOpen(true) : undefined}
                onDelete={canManageTask(selectedTask) ? () => setIsDeleteConfirmOpen(true) : undefined}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {bulkMode && bulkSelected.size > 0 && (
        <BulkActionBar
          count={bulkSelected.size}
          onStatusChange={handleBulkStatusChange}
          onPriorityChange={handleBulkPriorityChange}
          onDelete={handleBulkDelete}
          onClear={exitBulkMode}
        />
      )}

      <CreateTaskForm
        isOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreateTask}
        isLoading={createMutation.isPending}
      />

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="max-w-sm rounded-lg">
          <DialogHeader>
            <DialogTitle>Delete task?</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">"{selectedTask?.title}"</span> will be removed.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (selectedTask) {
                  deleteMutation.mutate(selectedTask.id)
                  setIsDeleteConfirmOpen(false)
                }
              }}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedTask && (
        <EditTaskForm
          isOpen={isEditOpen}
          onOpenChange={setIsEditOpen}
          onSubmit={handleEditTask}
          isLoading={updateMutation.isPending}
          initialValues={{
            title: selectedTask.title,
            description: selectedTask.description,
            deadline: selectedTask.deadline,
            priority: selectedTask.priority,
            status: selectedTask.status,
          }}
        />
      )}
    </div>
  )
}
