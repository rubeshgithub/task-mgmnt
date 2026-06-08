import { Button } from "@/components/ui/button"
import { UserAvatar } from "./UserAvatar"
import { Plus } from "lucide-react"

export interface Assignee {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

interface AssigneeListProps {
  assignees: Assignee[]
  onAddAssignee?: () => void
  onRemoveAssignee?: (id: string) => void
}

export function AssigneeList({ assignees, onAddAssignee, onRemoveAssignee }: AssigneeListProps) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold">Assigned To ({assignees.length})</div>
      <div className="space-y-2">
        {assignees.map((assignee) => (
          <div key={assignee.id} className="flex items-center justify-between p-2 rounded-md border">
            <div className="flex items-center gap-3">
              <UserAvatar name={assignee.name} email={assignee.email} avatarUrl={assignee.avatarUrl} size="sm" />
              <div>
                <p className="text-sm font-medium">{assignee.name}</p>
                <p className="text-xs text-muted-foreground">{assignee.email}</p>
              </div>
            </div>
            {onRemoveAssignee && (
              <Button variant="ghost" size="sm" onClick={() => onRemoveAssignee(assignee.id)}>
                ✕
              </Button>
            )}
          </div>
        ))}
      </div>
      {onAddAssignee && (
        <Button variant="outline" className="w-full" size="sm" onClick={onAddAssignee}>
          <Plus className="h-4 w-4 mr-2" />
          Add Assignee
        </Button>
      )}
    </div>
  )
}
