import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  message?: string
  className?: string
}

const sizeClasses = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-12 w-12",
}

export function LoadingSpinner({ size = "md", message, className }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      <div className={cn("animate-spin", sizeClasses[size])}>
        <div className="h-full w-full border-4 border-primary/20 border-t-primary rounded-full" />
      </div>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  )
}
