# shadcn/ui Quick Setup Guide
## Copy-Paste Installation Commands for Task Management App

---

## ⚡ 5-MINUTE SETUP

### Step 1: Create Vite + React Project
```bash
npm create vite@latest task-management -- --template react-ts
cd task-management
npm install
```

### Step 2: Install & Setup TailwindCSS (1 command)
```bash
npm install -D tailwindcss postcss autoprefixer && npx tailwindcss init -p
```

### Step 3: Configure TailwindCSS
Replace `tailwind.config.ts` with:
```bash
cat > tailwind.config.ts << 'EOF'
import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
EOF
```

### Step 4: Setup CSS Variables (tailwind.config.ts)
Update theme.extend.colors:
```typescript
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
}
```

### Step 5: Setup Global Styles
Update `src/index.css`:
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

### Step 6: Initialize shadcn/ui
```bash
npx shadcn-ui@latest init
```

When prompted, select:
```
✔ TypeScript: Yes
✔ Style: Default
✔ Base color: Slate
✔ CSS variables: yes
```

---

## 📦 INSTALL COMPONENTS (ONE COMMAND)

### All 25+ Components at Once
```bash
npx shadcn-ui@latest add button input card badge dialog form textarea select date-picker popover dropdown-menu tabs breadcrumb toast alert progress skeleton table pagination tooltip separator scroll-area command
```

### Or Install Individually (if you prefer)

**Core Components:**
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add card
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add dialog
```

**Forms:**
```bash
npx shadcn-ui@latest add form
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add select
npx shadcn-ui@latest add date-picker
npx shadcn-ui@latest add popover
```

**Navigation:**
```bash
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add breadcrumb
```

**Feedback:**
```bash
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add alert
npx shadcn-ui@latest add progress
npx shadcn-ui@latest add skeleton
```

**Data Display:**
```bash
npx shadcn-ui@latest add table
npx shadcn-ui@latest add pagination
npx shadcn-ui@latest add tooltip
```

**Utilities:**
```bash
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add scroll-area
npx shadcn-ui@latest add command
```

---

## 🎨 BRAND COLORS FOR YOUR APP

For **Immigration/Recruitment + Healthtech**, replace CSS variables:

```css
:root {
  /* Immigration/Recruitment Brand */
  --primary: 37.7 100% 50%;         /* Blue (#2563EB) - Trust, Official */
  --primary-foreground: 210 40% 98%;
  
  --secondary: 259.5 89.6% 58%;     /* Purple (#7C3AED) - Growth, Success */
  --secondary-foreground: 210 40% 98%;
  
  --accent: 180 100% 50%;           /* Cyan (#06B6D4) - Modern, Tech */
  --accent-foreground: 222.2 47.4% 11.2%;
  
  /* Status Colors */
  --success: 142.7 71.8% 29.4%;     /* Green (#10B981) - Approved */
  --warning: 38.6 92.1% 50.2%;      /* Amber (#F59E0B) - Attention */
  --error: 0 84.2% 60.2%;           /* Red (#EF4444) - Rejected/Urgent */
}

.dark {
  --primary: 217.2 91.2% 59.8%;     /* Brighter blue for dark mode */
  --accent: 186 100% 42%;           /* Adjusted cyan */
}
```

Or for **Healthtech Focus**:

```css
:root {
  --primary: 185.7 100% 35.3%;      /* Teal (#0891B2) - Healthcare */
  --secondary: 325.4 84.6% 55.1%;   /* Pink (#EC4899) - Care */
  --accent: 217.2 91.2% 59.8%;      /* Blue (#3B82F6) - Trust */
}
```

---

## 🚀 START DEV SERVER

```bash
npm run dev
```

Visit `http://localhost:5173`

---

## 📂 FOLDER STRUCTURE TO CREATE

```bash
mkdir -p src/components/ui
mkdir -p src/components/shared
mkdir -p src/components/forms
mkdir -p src/components/layout
mkdir -p src/hooks
mkdir -p src/lib
mkdir -p src/config
mkdir -p src/styles
```

---

## ✅ VERIFY INSTALLATION

Create `src/App.tsx`:

```typescript
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function App() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>shadcn/ui is Ready! ✅</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your design system foundation is installed.
            </p>
            
            <div className="flex gap-2">
              <Badge>shadcn/ui</Badge>
              <Badge variant="secondary">TailwindCSS</Badge>
              <Badge variant="outline">React 19</Badge>
            </div>
            
            <Button className="w-full">Start Building</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

Run `npm run dev` and you should see a beautiful card component! 🎉

---

## 🔧 INSTALL DEPENDENCIES YOU'LL NEED

```bash
# Forms
npm install react-hook-form @hookform/resolvers zod

# Data fetching
npm install @tanstack/react-query axios

# State management
npm install zustand

# Routing
npm install @tanstack/react-router

# Date handling
npm install date-fns

# Icons
npm install @tabler/icons-react

# Utilities
npm install clsx
```

---

## 📋 INSTALLATION CHECKLIST

```
✅ Vite + React + TypeScript project created
✅ TailwindCSS installed & configured
✅ shadcn/ui initialized
✅ 25+ components installed
✅ CSS variables configured
✅ Global styles added
✅ Dev server running
✅ Test component created
✅ Folder structure ready
```

---

## 🎯 YOU'RE READY TO:

1. **Create custom components** on top of shadcn/ui
2. **Build your task management app** with type-safe forms
3. **Apply your brand colors** (already in CSS variables)
4. **Enable dark mode** automatically (built-in)
5. **Ship to production** with zero bundle bloat

**Everything is copy-paste. Everything is yours. Zero vendor lock-in.** 🚀

Next: Jump to the component examples in `SHADCN_UI_DESIGN_SYSTEM.md` to start building!
