import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { z } from "zod"
import { ChevronDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import { UserAvatar } from "@/components/shared/UserAvatar"
import { authApi, type AuthUser } from "@/services/api"
import { cn } from "@/lib/utils"

const schema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(255),
  description: z.string().optional(),
  deadline: z.string().min(1, "Deadline is required"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
})

export type CreateTaskFormData = z.infer<typeof schema> & {
  assignedTo: AuthUser[]
}

interface CreateTaskFormProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateTaskFormData) => Promise<void>
  isLoading?: boolean
}

export function CreateTaskForm({ isOpen, onOpenChange, onSubmit, isLoading = false }: CreateTaskFormProps) {
  const [selectedUsers, setSelectedUsers] = useState<AuthUser[]>([])

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: authApi.listUsers,
    enabled: isOpen,
  })

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      deadline: new Date().toISOString().split("T")[0],
      priority: "medium",
    },
  })

  const toggleUser = (user: AuthUser) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    )
  }

  const handleSubmit = async (data: z.infer<typeof schema>) => {
    try {
      await onSubmit({ ...data, assignedTo: selectedUsers })
      form.reset()
      setSelectedUsers([])
      onOpenChange(false)
    } catch {
      // handled by parent
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) { form.reset(); setSelectedUsers([]) }
      onOpenChange(open)
    }}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-[500px] rounded-lg">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>Add a task and assign it to team members</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">

            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Task Title <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Review visa applications" disabled={isLoading} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Add task details and context…" rows={3} disabled={isLoading} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="deadline" render={({ field }) => (
                <FormItem>
                  <FormLabel>Deadline <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input type="date" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="priority" render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger disabled={isLoading}>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Assignee picker */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Assign to</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={isLoading}
                    className={cn(
                      "w-full h-9 flex items-center justify-between px-3 rounded-md border bg-background text-sm hover:bg-muted transition-colors disabled:opacity-50",
                      selectedUsers.length === 0 && "text-muted-foreground"
                    )}
                  >
                    {selectedUsers.length === 0
                      ? "Select team members…"
                      : `${selectedUsers.length} member${selectedUsers.length > 1 ? "s" : ""} selected`
                    }
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                  {users.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No members found</div>
                  ) : users.map((user) => (
                    <DropdownMenuCheckboxItem
                      key={user.id}
                      checked={selectedUsers.some((u) => u.id === user.id)}
                      onCheckedChange={() => toggleUser(user)}
                    >
                      <div className="flex items-center gap-2">
                        <UserAvatar name={user.name} email={user.email} size="xs" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{user.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Selected user chips */}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedUsers.map((user) => (
                    <span
                      key={user.id}
                      className="inline-flex items-center gap-1 pl-1 pr-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
                    >
                      <UserAvatar name={user.name} email={user.email} size="xs" />
                      {user.name.split(" ")[0]}
                      <button
                        type="button"
                        onClick={() => toggleUser(user)}
                        className="hover:text-destructive transition-colors"
                        aria-label={`Remove ${user.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating…" : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
