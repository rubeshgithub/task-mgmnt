import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  title: string
  description: string
  icon?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ title, description, icon = "📭", action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-center mb-6 max-w-sm">{description}</p>
      {action && (
        <Button onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </div>
  )
}
