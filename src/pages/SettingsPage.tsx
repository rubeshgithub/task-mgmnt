import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { orgApi, authApi, type OrgRole } from "@/services/api"
import { useAuth } from "@/context/AuthContext"
import { useTheme } from "@/hooks/use-theme"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { UserAvatar } from "@/components/shared/UserAvatar"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { ArrowLeft, Sun, Moon, Plus, Crown, Shield, User } from "lucide-react"
import { cn } from "@/lib/utils"

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
  pin: z.string().optional().refine(
    (v) => !v || (/^\d{4,6}$/.test(v)),
    { message: "PIN must be 4 to 6 digits" }
  ),
})

const orgSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
})

const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "member"] as const),
})

type ProfileForm = z.infer<typeof profileSchema>
type OrgForm = z.infer<typeof orgSchema>
type InviteForm = z.infer<typeof inviteSchema>

const ROLE_ICONS: Record<OrgRole, React.ReactNode> = {
  owner: <Crown className="h-3.5 w-3.5 text-amber-500" />,
  admin: <Shield className="h-3.5 w-3.5 text-primary" />,
  member: <User className="h-3.5 w-3.5 text-muted-foreground" />,
}

const ROLE_LABELS: Record<OrgRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
}

export function SettingsPage() {
  const { user, updateUser } = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()
  const navigate = useNavigate()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [inviteSent, setInviteSent] = useState(false)

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: { name: user?.name ?? "", phone: user?.phone ?? "" },
  })

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileForm) => authApi.updateProfile(data.name, data.phone || undefined, data.pin || undefined),
    onSuccess: (updated) => {
      updateUser({ name: updated.name, phone: updated.phone ?? undefined })
      toast({ title: "Profile updated" })
    },
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  })

  const canManage = user?.role === "owner" || user?.role === "admin"

  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: ["org"],
    queryFn: orgApi.get,
  })

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["members"],
    queryFn: orgApi.members,
  })

  const orgForm = useForm<OrgForm>({
    resolver: zodResolver(orgSchema),
    values: { name: org?.name ?? "" },
  })

  const inviteForm = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "member" },
  })

  const updateOrgMutation = useMutation({
    mutationFn: (data: OrgForm) => orgApi.update({ name: data.name }),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["org"] })
      updateUser({ org_name: updated.name })
      toast({ title: "Organisation updated" })
    },
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  })

  const inviteMutation = useMutation({
    mutationFn: (data: InviteForm) => authApi.createInvitation(data.email, data.role),
    onSuccess: () => {
      inviteForm.reset()
      setInviteSent(true)
      setTimeout(() => setInviteSent(false), 4000)
      toast({ title: "Invitation sent", description: "They'll receive an email with a signup link." })
    },
    onError: (e: Error) => toast({ title: "Invite failed", description: e.message, variant: "destructive" }),
  })

  if (orgLoading) return <LoadingSpinner message="Loading settings…" className="min-h-screen" />

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/tasks" })}
            className="h-8 w-8 flex items-center justify-center rounded-md border border-input bg-background hover:bg-muted transition-colors"
            aria-label="Back to tasks"
          >
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-bold leading-tight">Settings</h1>
            <p className="hidden sm:block text-xs text-muted-foreground">{org?.name}</p>
          </div>
        </div>
        <button
          onClick={toggleTheme}
          className="h-8 w-8 flex items-center justify-center rounded-md border border-input bg-background hover:bg-muted transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* My profile */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">My Profile</h2>
          <div className="bg-card border rounded-xl p-5">
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit((d) => updateProfileMutation.mutate(d))} className="space-y-4">
                <FormField control={profileForm.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={profileForm.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile number <span className="text-muted-foreground font-normal">(Canadian, for SMS alerts)</span></FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+1 613 555 1234" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={profileForm.control} name="pin" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Voice PIN <span className="text-muted-foreground font-normal">(4–6 digits, for phone check-in)</span></FormLabel>
                    <FormControl>
                      <Input type="password" inputMode="numeric" placeholder="Set or update PIN" maxLength={6} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" size="sm" disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? "Saving…" : "Save profile"}
                </Button>
              </form>
            </Form>
          </div>
        </section>

        {/* Organisation profile */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Organisation</h2>
          <div className="bg-card border rounded-xl p-5">
            {canManage ? (
              <Form {...orgForm}>
                <form onSubmit={orgForm.handleSubmit((d) => updateOrgMutation.mutate(d))} className="space-y-4">
                  <FormField control={orgForm.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organisation name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" size="sm" disabled={updateOrgMutation.isPending}>
                    {updateOrgMutation.isPending ? "Saving…" : "Save changes"}
                  </Button>
                </form>
              </Form>
            ) : (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Name</p>
                <p className="font-medium">{org?.name}</p>
              </div>
            )}
          </div>
        </section>

        {/* Invite member */}
        {!canManage && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Invite member</h2>
            <div className="bg-card border rounded-xl px-5 py-4 text-sm text-muted-foreground">
              Only admins and owners can invite new members.
            </div>
          </section>
        )}
        {canManage && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Invite member</h2>
            <div className="bg-card border rounded-xl p-5">
              <Form {...inviteForm}>
                <form onSubmit={inviteForm.handleSubmit((d) => inviteMutation.mutate(d))} className="space-y-4">
                  <div className="grid grid-cols-[1fr_140px] gap-3">
                    <FormField control={inviteForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="colleague@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={inviteForm.control} name="role" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="flex items-center gap-3">
                    <Button type="submit" size="sm" disabled={inviteMutation.isPending}>
                      <Plus className="h-4 w-4 mr-1.5" />
                      {inviteMutation.isPending ? "Sending…" : "Send invite"}
                    </Button>
                    {inviteSent && (
                      <span className="text-sm text-emerald-600 dark:text-emerald-400">Invitation sent!</span>
                    )}
                  </div>
                </form>
              </Form>
            </div>
          </section>
        )}

        {/* Members list */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Members · {members.length}
          </h2>
          <div className="bg-card border rounded-xl divide-y">
            {membersLoading ? (
              <div className="px-5 py-4 text-sm text-muted-foreground">Loading…</div>
            ) : members.map((member) => (
              <div key={member.id} className="px-5 py-3.5 flex items-center gap-3">
                <UserAvatar name={member.name} email={member.email} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate flex items-center gap-1.5">
                    {member.name}
                    {member.id === user?.id && (
                      <span className="text-[10px] text-muted-foreground font-normal">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                </div>
                <div className={cn(
                  "flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md",
                  member.role === "owner" && "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
                  member.role === "admin" && "bg-primary/10 text-primary",
                  member.role === "member" && "bg-muted text-muted-foreground",
                )}>
                  {ROLE_ICONS[member.role]}
                  {ROLE_LABELS[member.role]}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
