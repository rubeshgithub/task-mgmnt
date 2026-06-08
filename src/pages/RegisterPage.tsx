import { useState } from "react"
import { useNavigate, Link } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useAuth } from "@/context/AuthContext"
import { useTheme } from "@/hooks/use-theme"
import { Sun, Moon, Building2 } from "lucide-react"

const schema = z.object({
  orgName: z.string().min(2, "Organisation name must be at least 2 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})
type FormData = z.infer<typeof schema>

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState("")
  const { theme, toggle: toggleTheme } = useTheme()

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { orgName: "", name: "", email: "", password: "", confirmPassword: "" },
  })

  const onSubmit = async (data: FormData) => {
    setError("")
    try {
      await register(data.name, data.email, data.password, data.orgName)
      navigate({ to: "/tasks" })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Registration failed")
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 h-8 w-8 flex items-center justify-center rounded-md border border-input bg-card hover:bg-muted transition-colors"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
      </button>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Task Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Set up your workspace</p>
        </div>

        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-1">Create your workspace</h2>
          <p className="text-sm text-muted-foreground mb-6">You'll be the owner and can invite your team</p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

              <FormField control={form.control} name="orgName" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    Organisation name
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Acme Immigration" autoComplete="organization" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Your account</p>

                <div className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full name</FormLabel>
                      <FormControl>
                        <Input placeholder="Alice Johnson" autoComplete="name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@example.com" autoComplete="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Min. 6 characters" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating workspace…" : "Create workspace"}
              </Button>
            </form>
          </Form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
