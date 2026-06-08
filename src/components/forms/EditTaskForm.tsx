import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { z } from "zod"
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
import { authApi } from "@/services/api"
import type { TaskStatus } from "@/components/shared/StatusBadge"
import type { Priority } from "@/components/shared/PriorityBadge"

const schema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(255),
  description: z.string().optional(),
  deadline: z.string().min(1, "Deadline is required"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["assigned", "started", "in_progress", "completed", "reviewed", "on_hold"]),
})

export type EditTaskFormData = z.infer<typeof schema>

interface EditTaskFormProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: EditTaskFormData) => Promise<void>
  isLoading?: boolean
  initialValues: {
    title: string
    description: string
    deadline: Date
    priority: Priority
    status: TaskStatus
  }
}

export function EditTaskForm({ isOpen, onOpenChange, onSubmit, isLoading = false, initialValues }: EditTaskFormProps) {
  const form = useForm<EditTaskFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initialValues.title,
      description: initialValues.description,
      deadline: initialValues.deadline.toISOString().split("T")[0],
      priority: initialValues.priority,
      status: initialValues.status,
    },
  })

  useEffect(() => {
    if (isOpen) {
      form.reset({
        title: initialValues.title,
        description: initialValues.description,
        deadline: initialValues.deadline.toISOString().split("T")[0],
        priority: initialValues.priority,
        status: initialValues.status,
      })
    }
  }, [isOpen])

  const handleSubmit = async (data: EditTaskFormData) => {
    try {
      await onSubmit(data)
      onOpenChange(false)
    } catch {
      // handled by parent
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-[500px] rounded-lg">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>Update the task details</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">

            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Task Title <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input disabled={isLoading} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea rows={3} disabled={isLoading} {...field} />
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
                  <Select onValueChange={field.onChange} value={field.value}>
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

            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger disabled={isLoading}>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="started">Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
