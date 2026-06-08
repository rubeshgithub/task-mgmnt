import { useState, useEffect } from "react"
import { useNavigate, useParams } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { authApi, type InvitationPreview } from "@/services/api"
import { useTheme } from "@/hooks/use-theme"
import { Sun, Moon, Building2, Loader2, AlertCircle } from "lucide-react"

const schema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})
type FormData = z.infer<typeof schema>

export function InviteAcceptPage() {
  const { token } = useParams({ from: "/invite/$token" })
  const navigate = useNavigate()
  const { theme, toggle: toggleTheme } = useTheme()

  const [preview, setPreview] = useState<InvitationPreview | null>(null)
  const [previewError, setPreviewError] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitError, setSubmitError] = useState("")

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  })

  useEffect(() => {
    authApi.previewInvitation(token)
      .then(setPreview)
      .catch((e: Error) => setPreviewError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  const onSubmit = async (data: FormData) => {
    if (!preview) return
    setSubmitError("")
    try {
      const res = await authApi.acceptInvitation(token, preview.email, data.password)
      localStorage.setItem("auth_token", res.access_token)
      localStorage.setItem("auth_user", JSON.stringify(res.user))
      navigate({ to: "/tasks" })
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "Failed to accept invitation")
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
        </div>

        <div className="bg-card border rounded-xl p-6 shadow-sm">
          {loading && (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading invitation…</span>
            </div>
          )}

          {!loading && previewError && (
            <div className="flex items-start gap-3 py-4">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Invitation unavailable</p>
                <p className="text-sm text-muted-foreground mt-0.5">{previewError}</p>
              </div>
            </div>
          )}

          {!loading && preview && (
            <>
              <div className="flex items-center gap-3 mb-5 pb-5 border-b">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{preview.org_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Invited by {preview.invited_by_name} · {preview.role}
                  </p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                Joining as <span className="font-medium text-foreground">{preview.email}</span>. Create a password to get started.
              </p>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

                  {submitError && <p className="text-sm text-destructive">{submitError}</p>}

                  <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Joining…" : `Join ${preview.org_name}`}
                  </Button>
                </form>
              </Form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
