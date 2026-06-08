import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { TaskCard, TASK_GRID } from "@/components/shared/TaskCard"
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
import { StatsBar } from "@/components/shared/StatsBar"
import { cn } from "@/lib/utils"
import { Plus, X, ArrowLeft, Sun, Moon, LogOut, Settings } from "lucide-react"
import { useTheme } from "@/hooks/use-theme"
import { useAuth } from "@/context/AuthContext"
import { useNavigate } from "@tanstack/react-router"

// Map API task (ISO date strings) → component shape (Date objects)
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
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<Set<TaskStatus>>(new Set())
  const [priorityFilter, setPriorityFilter] = useState<Set<Priority>>(new Set())
  const [assigneeFilter, setAssigneeFilter] = useState<Set<string>>(new Set())
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
    return true
  })

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
        <div>
          <h1 className="text-lg font-bold leading-tight">{user?.org_name || "Task Management"}</h1>
          <p className="hidden sm:block text-xs text-muted-foreground">
            {tasks.length} tasks
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <span className="hidden sm:block text-xs text-muted-foreground">
              {user.name}
            </span>
          )}
          <button
            onClick={toggleTheme}
            className="h-8 w-8 flex items-center justify-center rounded-md border border-input bg-background hover:bg-muted transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark"
              ? <Sun className="h-4 w-4 text-muted-foreground" />
              : <Moon className="h-4 w-4 text-muted-foreground" />
            }
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

      {/* Stats */}
      <StatsBar tasks={tasks} />

      {/* Body */}
      <div className="flex flex-1 min-h-0">

        {/* Task list */}
        <div className={cn(
          "flex flex-col overflow-y-auto transition-all w-full",
          selectedTask && "md:w-[55%] lg:w-3/5"
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
              {/* Sticky filter bar + column header */}
              <div className="sticky top-0 z-10 bg-background">
                <FilterBar
                  search={search}
                  onSearchChange={setSearch}
                  statusFilter={statusFilter}
                  onStatusToggle={toggleStatus}
                  priorityFilter={priorityFilter}
                  onPriorityToggle={togglePriority}
                  assigneeFilter={assigneeFilter}
                  onAssigneeToggle={toggleAssignee}
                  users={users}
                  onClear={clearFilters}
                  resultCount={filteredTasks.length}
                  totalCount={tasks.length}
                />
                <div className={cn(
                  "bg-background border-b grid items-center gap-3 px-4 py-2 text-xs text-muted-foreground font-semibold uppercase tracking-wide",
                  TASK_GRID
                )}>
                  <span className="text-center">Pri</span>
                  <span>Title</span>
                  <span>Status</span>
                  <span className="hidden md:block">Deadline</span>
                  <span className="hidden lg:block text-right">Assignees</span>
                  <span />
                </div>
              </div>

              <div className="p-3 space-y-1">
                {filteredTasks.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    No tasks match your filters
                  </div>
                ) : filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    {...task}
                    isSelected={selectedId === task.id}
                    onTaskClick={(id) => setSelectedId((prev) => prev === id ? null : id)}
                  />
                ))
                }
              </div>
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

      <CreateTaskForm
        isOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreateTask}
        isLoading={createMutation.isPending}
      />
      {/* Delete confirmation */}
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
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
              Cancel
            </Button>
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
