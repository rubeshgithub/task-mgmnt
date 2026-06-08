# shadcn/ui Design System Setup
## For Task Management System (Immigration/Recruitment + Healthtech)

---

## 🎨 WHY shadcn/ui FOR YOUR PROJECT

### Benefits Over Other UI Libraries

| Aspect | Material-UI | Chakra UI | shadcn/ui |
|--------|------------|-----------|-----------|
| **Bundle** | +300KB | +50KB | +0KB (copy-paste) |
| **Customization** | Limited | Good | 100% |
| **Themes** | Predefined | Predefined | Yours completely |
| **Dependencies** | Many | Moderate | Zero (uses Radix) |
| **Accessibility** | Good | Excellent | Excellent |
| **TypeScript** | Good | Excellent | Excellent |
| **Learning Curve** | Steep | Moderate | Easy |
| **Code Ownership** | No | No | Yes |

**shadcn/ui wins because:**
- ✅ Components are literally copied into YOUR project
- ✅ Full control over every pixel
- ✅ Zero additional bundle size
- ✅ Built on Radix (headless) + TailwindCSS
- ✅ Perfect for design systems
- ✅ Easy to extend and customize

---

## 📦 SETUP PHASE

### Step 1: Create React Project
```bash
npm create vite@latest task-management -- --template react-ts
cd task-management
npm install
```

### Step 2: Install TailwindCSS
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Step 3: Configure tailwind.config.ts
```typescript
import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
```

### Step 4: Add CSS Variables (src/index.css)
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --muted: 221.2 63.3% 97.8%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 221.2 72.4% 49.8%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 72.22% 50.59%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --primary: 221.2 72.4% 49.8%;
    --primary-foreground: 210 40% 98%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --ring: 221.2 72.4% 49.8%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.3% 65.1%;
    --accent: 217.2 91.2% 59.8%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 212.7 26.8% 83.9%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --ring: 217.2 91.2% 59.8%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

### Step 5: Initialize shadcn/ui
```bash
npx shadcn-ui@latest init
```

**When prompted:**
```
✔ Would you like to use TypeScript (recommended)? › Yes
✔ Which style would you like to use? › Default
✔ Which color would you like as the base color? › Slate
✔ Where is your global CSS file? › src/index.css
✔ Do you want to use CSS variables for theming? › yes
✔ Write configuration files? › yes
✔ Confirm installation? › yes
```

---

## 🎨 CUSTOM THEME FOR YOUR PROJECT

### Brand Colors (Immigration/Recruitment + Healthtech)

Create `src/config/theme.ts`:

```typescript
// Immigration & Recruitment Colors
const immigrationTheme = {
  primary: "#2563EB",      // Blue (trust, official)
  secondary: "#7C3AED",    // Purple (growth, success)
  accent: "#06B6D4",       // Cyan (modern, tech)
  success: "#10B981",      // Green (approval, done)
  warning: "#F59E0B",      // Amber (attention needed)
  error: "#EF4444",        // Red (rejected, urgent)
}

// Healthtech Colors
const healthTheme = {
  primary: "#0891B2",      // Teal (healthcare)
  secondary: "#EC4899",    // Pink (care, compassion)
  accent: "#3B82F6",       // Blue (trust, clinical)
  success: "#14B8A6",      // Teal (healthy)
  warning: "#F59E0B",      // Amber (caution)
  error: "#DC2626",        // Red (critical)
}

export const appTheme = immigrationTheme // or healthTheme
```

### Update tailwind.config.ts for Custom Theme

```typescript
import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Your custom brand colors
        brand: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",  // Primary
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
        },
      },
    },
  },
}

export default config
```

---

## 📁 PROJECT STRUCTURE WITH SHADCN/UI

```
src/
├── components/
│   ├── ui/                    # shadcn/ui components (auto-generated)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── select.tsx
│   │   ├── date-picker.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── popover.tsx
│   │   ├── tabs.tsx
│   │   └── ... (all shadcn components)
│   │
│   ├── shared/                # Your custom components (built on shadcn)
│   │   ├── StatusBadge.tsx
│   │   ├── PriorityBadge.tsx
│   │   ├── TaskCard.tsx
│   │   ├── TaskList.tsx
│   │   ├── TaskDetailCard.tsx
│   │   ├── UserAvatar.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── EmptyState.tsx
│   │
│   ├── forms/                 # Form components (built on shadcn)
│   │   ├── CreateTaskForm.tsx
│   │   ├── LoginForm.tsx
│   │   ├── EditTaskForm.tsx
│   │   └── FilterTasksForm.tsx
│   │
│   └── layout/                # Layout components
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       ├── MainLayout.tsx
│       └── Dashboard.tsx
│
├── hooks/
│   ├── useAuth.ts
│   ├── useTasks.ts
│   └── useTheme.ts
│
├── lib/
│   ├── utils.ts               # Utility functions (from shadcn)
│   └── cn.ts                  # ClassNames utility
│
├── config/
│   ├── theme.ts               # Your theme config
│   └── colors.ts              # Color palette
│
└── styles/
    └── globals.css            # Global styles
```

---

## 🎯 ESSENTIAL SHADCN/UI COMPONENTS FOR YOUR APP

### Install These Components

```bash
# Core UI
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add card
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add dialog

# Forms & Input
npx shadcn-ui@latest add form
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add select
npx shadcn-ui@latest add date-picker
npx shadcn-ui@latest add popover

# Navigation
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add breadcrumb

# Feedback
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add alert
npx shadcn-ui@latest add progress
npx shadcn-ui@latest add skeleton

# Data Display
npx shadcn-ui@latest add table
npx shadcn-ui@latest add pagination
npx shadcn-ui@latest add tooltip

# Utilities
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add scroll-area
npx shadcn-ui@latest add command
npx shadcn-ui@latest add search
```

**Total: 25+ components, all copy-paste into your project**

---

## 🛠️ BUILDING CUSTOM COMPONENTS ON SHADCN/UI

### Example 1: StatusBadge Component

```typescript
// src/components/shared/StatusBadge.tsx
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type TaskStatus = "assigned" | "started" | "in_progress" | "completed" | "reviewed" | "on_hold"

interface StatusBadgeProps {
  status: TaskStatus
  className?: string
}

const statusConfig: Record<TaskStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  assigned: { label: "Assigned", variant: "default" },
  started: { label: "Started", variant: "outline" },
  in_progress: { label: "In Progress", variant: "default" },
  completed: { label: "Completed", variant: "secondary" },
  reviewed: { label: "Reviewed", variant: "secondary" },
  on_hold: { label: "On Hold", variant: "destructive" },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { label, variant } = statusConfig[status]
  
  return (
    <Badge variant={variant} className={cn("whitespace-nowrap", className)}>
      {label}
    </Badge>
  )
}
```

### Example 2: PriorityBadge Component

```typescript
// src/components/shared/PriorityBadge.tsx
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type Priority = "low" | "medium" | "high" | "urgent"

interface PriorityBadgeProps {
  priority: Priority
  className?: string
}

const priorityConfig: Record<Priority, { label: string; color: string }> = {
  low: { label: "Low", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  medium: { label: "Medium", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  high: { label: "High", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  urgent: { label: "Urgent", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const { label, color } = priorityConfig[priority]
  
  return (
    <Badge className={cn(color, "whitespace-nowrap", className)}>
      {label}
    </Badge>
  )
}
```

### Example 3: TaskCard Component

```typescript
// src/components/shared/TaskCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "./StatusBadge"
import { PriorityBadge } from "./PriorityBadge"
import { formatDistanceToNow } from "date-fns"

interface Task {
  id: string
  title: string
  status: "assigned" | "started" | "in_progress" | "completed" | "reviewed" | "on_hold"
  priority: "low" | "medium" | "high" | "urgent"
  deadline: Date
  assignedTo: { name: string; email: string }[]
  createdAt: Date
}

interface TaskCardProps {
  task: Task
  onTaskClick: (taskId: string) => void
}

export function TaskCard({ task, onTaskClick }: TaskCardProps) {
  const isOverdue = new Date(task.deadline) < new Date() && task.status !== "completed"
  
  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onTaskClick(task.id)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base line-clamp-2">{task.title}</CardTitle>
          <PriorityBadge priority={task.priority} />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <StatusBadge status={task.status} />
          {isOverdue && <Badge variant="destructive">Overdue</Badge>}
        </div>
        
        <div className="text-sm text-muted-foreground">
          Due {formatDistanceToNow(new Date(task.deadline), { addSuffix: true })}
        </div>
        
        <div className="flex items-center gap-2">
          {task.assignedTo.map((assignee) => (
            <div
              key={assignee.email}
              className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold"
              title={assignee.name}
            >
              {assignee.name.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
        
        <Button variant="ghost" className="w-full justify-start" size="sm">
          View Details →
        </Button>
      </CardContent>
    </Card>
  )
}
```

### Example 4: CreateTaskForm Component

```typescript
// src/components/forms/CreateTaskForm.tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  deadline: z.string(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  assignedTo: z.array(z.string()).min(1, "At least one assignee required"),
})

type CreateTaskFormData = z.infer<typeof createTaskSchema>

interface CreateTaskFormProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateTaskFormData) => Promise<void>
}

export function CreateTaskForm({ isOpen, onOpenChange, onSubmit }: CreateTaskFormProps) {
  const form = useForm<CreateTaskFormData>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      deadline: new Date().toISOString().split("T")[0],
      priority: "medium",
      assignedTo: [],
    },
  })

  const handleSubmit = async (data: CreateTaskFormData) => {
    await onSubmit(data)
    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Add a new task and assign it to team members
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Review visa applications" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add task details..." {...field} />
                  </FormControl>
                  <FormDescription>Optional, but recommended for clarity</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deadline *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
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
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating..." : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 🌙 DARK MODE SUPPORT

shadcn/ui comes with built-in dark mode. Add to your `App.tsx`:

```typescript
import { useEffect, useState } from "react"

export function App() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark")
    setIsDark(isDarkMode)
  }, [])

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle("dark")
    setIsDark(!isDark)
  }

  return (
    <div>
      <button onClick={toggleDarkMode}>
        {isDark ? "🌞" : "🌙"} Toggle Dark Mode
      </button>
      {/* Your app */}
    </div>
  )
}
```

---

## 🎨 CUSTOMIZING SHADCN COMPONENTS

### Example: Customizing Button Styles

Edit `src/components/ui/button.tsx`:

```typescript
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Add your custom variant
        brand: "bg-brand-500 text-white hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-700",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

### Using Custom Variant

```typescript
<Button variant="brand">Custom Brand Button</Button>
```

---

## 📋 COMPONENT INVENTORY FOR YOUR APP

### Must-Have Components (25+)

```
✅ Button          - All interactions
✅ Input           - Forms and searches
✅ Textarea        - Task descriptions
✅ Card            - Task cards, containers
✅ Badge           - Status and priority
✅ Dialog          - Create/edit modals
✅ Select          - Dropdowns (priority, assignee)
✅ Form            - React Hook Form integration
✅ DatePicker      - Deadline selection
✅ Popover         - Quick info, tooltips
✅ DropdownMenu    - User menu, actions
✅ Tabs            - Views (all, assigned, created)
✅ Breadcrumb      - Navigation context
✅ Toast           - Notifications
✅ Alert           - Important messages
✅ Progress        - Task progress bars
✅ Skeleton        - Loading states
✅ Table           - Task listing (optional)
✅ Pagination      - Task list pagination
✅ Tooltip         - Hover info
✅ Separator       - Visual dividers
✅ ScrollArea      - Scrollable areas
✅ Command         - Command palette (optional)
✅ Scroll-Top      - Back to top button
✅ Avatar          - User avatars (custom build)
```

---

## 🔧 BUILDING CUSTOM COMPONENTS

### UserAvatar Component (Custom, using shadcn primitives)

```typescript
// src/components/shared/UserAvatar.tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface UserAvatarProps {
  name: string
  email: string
  avatarUrl?: string
  size?: "sm" | "md" | "lg"
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
}

export function UserAvatar({ name, email, avatarUrl, size = "md" }: UserAvatarProps) {
  const initials = name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Avatar className={sizeClasses[size]}>
            <AvatarImage src={avatarUrl} alt={name} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </TooltipTrigger>
        <TooltipContent>
          <p>{name}</p>
          <p className="text-xs text-muted-foreground">{email}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
```

---

## 📊 DESIGN SYSTEM DOCUMENTATION

Create `src/docs/DESIGN_SYSTEM.md`:

```markdown
# Design System Documentation

## Color Palette

### Primary Colors
- Primary: #2563EB (Blue)
- Secondary: #7C3AED (Purple)
- Accent: #06B6D4 (Cyan)

### Semantic Colors
- Success: #10B981 (Green)
- Warning: #F59E0B (Amber)
- Error: #EF4444 (Red)
- Info: #3B82F6 (Blue)

## Typography

- Headings: Inter, 600 weight
- Body: Inter, 400 weight
- Code: Fira Code, 400 weight

## Spacing

- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px

## Components

### Button
- Default
- Secondary
- Destructive
- Ghost
- Link

### Status Badges
- Assigned (default)
- In Progress (primary)
- Completed (success)
- On Hold (destructive)

## Dark Mode

All colors adapt automatically with `.dark` class on `<html>` element.
```

---

## 🚀 BEST PRACTICES WITH SHADCN/UI

### ✅ DO

```typescript
// ✅ Customize components for your needs
export function TaskCard({ task }: Props) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle>{task.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <StatusBadge status={task.status} />
        <PriorityBadge priority={task.priority} />
      </CardContent>
    </Card>
  )
}

// ✅ Use className for tailwind customization
<Button className="w-full" size="lg">
  Create Task
</Button>

// ✅ Build custom components on top of shadcn
export function TaskForm() {
  return (
    <Form>
      {/* Your custom form using shadcn inputs */}
    </Form>
  )
}

// ✅ Use the cn() utility for conditional styles
<div className={cn("base-class", isActive && "active-class")}>
</div>
```

### ❌ DON'T

```typescript
// ❌ Don't import from external UI libraries
import { Button } from "react-bootstrap"

// ❌ Don't use inline styles instead of Tailwind
<Button style={{ backgroundColor: "blue" }} />

// ❌ Don't over-engineer if shadcn has what you need
// Instead of building from scratch, use shadcn Dialog

// ❌ Don't ignore dark mode
// Always use semantic color variables, not hardcoded colors
```

---

## 📦 FILE TO ADD COMPONENTS

Every time you need a component:

```bash
npx shadcn-ui@latest add component-name
```

This copies the component code into your project. You then own it completely and can customize it.

---

## 🎓 LEARNING RESOURCES

- **shadcn/ui Docs**: https://ui.shadcn.com/
- **Radix UI** (headless components): https://www.radix-ui.com/
- **Tailwind CSS**: https://tailwindcss.com/
- **CVA** (class variants): https://cva.style/

---

## ✨ WHY SHADCN/UI FOR YOUR DESIGN SYSTEM

1. **You Control Everything**
   - Components are in your codebase
   - No vendor lock-in
   - Can modify as needed

2. **Consistent Design**
   - All components use same utilities
   - Dark mode automatic
   - Accessibility built-in

3. **No Bundle Bloat**
   - Only include components you use
   - Everything tree-shakeable
   - Minimal overhead

4. **Great Developer Experience**
   - Simple copy-paste installation
   - Excellent TypeScript support
   - Easy to customize and extend

5. **Perfect for Design Systems**
   - Built on Radix (headless)
   - Styled with Tailwind
   - Accessibility by default

---

## 🎯 NEXT STEPS

1. **Set up project** with Vite + TypeScript
2. **Install TailwindCSS** and configure
3. **Initialize shadcn/ui**
4. **Install 25+ core components**
5. **Build custom components** on top of shadcn
6. **Customize colors** for your brand
7. **Add dark mode** support
8. **Create design system docs**

**Your design system is ready!** 🎉

Everything is copy-paste, fully customizable, and yours to own.
