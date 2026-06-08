import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface UserAvatarProps {
  name: string
  email: string
  avatarUrl?: string
  size?: "xs" | "sm" | "md" | "lg"
  onClick?: () => void
}

const sizeClasses = {
  xs: "h-6 w-6 text-xs",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
}

export function UserAvatar({ name, email, avatarUrl, size = "md", onClick }: UserAvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Avatar className={cn(sizeClasses[size], onClick && "cursor-pointer")} onClick={onClick}>
            <AvatarImage src={avatarUrl} alt={name} />
            <AvatarFallback className="bg-primary text-primary-foreground font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="font-semibold">{name}</p>
          <p className="text-xs text-muted-foreground">{email}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
