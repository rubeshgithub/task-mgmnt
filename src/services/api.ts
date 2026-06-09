const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8001/api"

export interface Assignee {
  id: string
  name: string
  email: string
}

export interface Task {
  id: string
  title: string
  description: string
  status: string
  priority: string
  deadline: string
  assigned_to: Assignee[]
  created_by: Assignee
  created_at: string
  progress_percentage: number
  tags: string[]
  org_id: string
  comment_count: number
  attachment_count: number
}

export interface CreateTaskPayload {
  title: string
  description?: string
  priority: string
  deadline: string
  tags?: string[]
  assigned_to?: Assignee[]
}

export interface UpdateTaskPayload {
  status?: string
  title?: string
  description?: string
  priority?: string
  deadline?: string
  progress_percentage?: number
  tags?: string[]
}

export type OrgRole = "owner" | "admin" | "member"

export interface AuthUser {
  id: string
  name: string
  email: string
  org_id: string
  role: OrgRole
  org_name: string
  phone?: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: AuthUser
}

export interface OrgSettings {
  primary_color: string
  logo_url?: string
  sms_enabled: boolean
  email_enabled: boolean
}

export interface Organisation {
  id: string
  name: string
  slug: string
  settings: OrgSettings
  created_at: string
}

export interface OrgMember {
  id: string
  name: string
  email: string
  role: OrgRole
  joined_at: string
}

export interface InvitationPreview {
  org_name: string
  role: OrgRole
  email: string
  invited_by_name: string
}

function getToken() {
  return localStorage.getItem("auth_token")
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...init,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail ?? `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const tasksApi = {
  list: ()                                          => request<Task[]>("/tasks"),
  get: (id: string)                                 => request<Task>(`/tasks/${id}`),
  create: (data: CreateTaskPayload)                 => request<Task>("/tasks", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: UpdateTaskPayload)     => request<Task>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string)                              => request<void>(`/tasks/${id}`, { method: "DELETE" }),
}

export const authApi = {
  register: (name: string, email: string, password: string, org_name: string) =>
    request<TokenResponse>("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password, org_name }) }),
  login: (email: string, password: string) =>
    request<TokenResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => request<AuthUser>("/auth/me"),
  listUsers: () => request<AuthUser[]>("/auth/users"),
  updateProfile: (name: string, phone?: string, pin?: string) =>
    request<AuthUser>("/auth/profile", { method: "PATCH", body: JSON.stringify({ name, phone: phone ?? null, pin: pin ?? null }) }),
  createInvitation: (email: string, role: OrgRole) =>
    request("/auth/invitations", { method: "POST", body: JSON.stringify({ email, role }) }),
  previewInvitation: (token: string) =>
    request<InvitationPreview>(`/auth/invitations/preview/${token}`),
  acceptInvitation: (token: string, email: string, password: string) =>
    request<TokenResponse>(`/auth/invitations/accept/${token}`, { method: "POST", body: JSON.stringify({ email, password }) }),
}

export interface Reminder {
  id: string
  title: string
  description: string
  category: string
  status: "pending" | "completed" | "cancelled"
  remind_at: string | null
  created_at: string
  completed_at: string | null
  reminded: boolean
  recurrence: "daily" | "weekly" | "monthly" | null
}

export interface CreateReminderPayload {
  title: string
  description?: string
  category?: string
  remind_at?: string | null
  recurrence?: string | null
}

export interface UpdateReminderPayload {
  title?: string
  description?: string
  category?: string
  remind_at?: string | null
  status?: string
  recurrence?: string | null
}

export const remindersApi = {
  list:   ()                                            => request<Reminder[]>("/reminders"),
  create: (data: CreateReminderPayload)                 => request<Reminder>("/reminders", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: UpdateReminderPayload)     => request<Reminder>(`/reminders/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string)                                  => request<void>(`/reminders/${id}`, { method: "DELETE" }),
}

export interface Comment {
  id: string
  task_id: string
  text: string
  created_by: Assignee
  created_at: string
}

export interface Attachment {
  key: string
  name: string
  size: number
  content_type: string
  url: string
  uploaded_by: { id: string; name: string }
  uploaded_at: string
}

export const commentsApi = {
  list:   (taskId: string)                       => request<Comment[]>(`/tasks/${taskId}/comments`),
  create: (taskId: string, text: string)         => request<Comment>(`/tasks/${taskId}/comments`, { method: "POST", body: JSON.stringify({ text }) }),
  delete: (taskId: string, commentId: string)    => request<void>(`/tasks/${taskId}/comments/${commentId}`, { method: "DELETE" }),
}

export const attachmentsApi = {
  list:   (taskId: string)                       => request<Attachment[]>(`/tasks/${taskId}/attachments`),
  delete: (taskId: string, key: string)          => request<void>(`/tasks/${taskId}/attachments/${encodeURIComponent(key)}`, { method: "DELETE" }),
  upload: (taskId: string, file: File): Promise<Attachment> => {
    const token = localStorage.getItem("auth_token")
    const form = new FormData()
    form.append("file", file)
    const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8001/api"
    return fetch(`${BASE_URL}/tasks/${taskId}/attachments`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { detail?: string }).detail ?? `HTTP ${res.status}`)
      }
      return res.json()
    })
  },
}

export const orgApi = {
  get: () => request<Organisation>("/organisations/me"),
  update: (data: { name?: string; settings?: Partial<OrgSettings> }) =>
    request<Organisation>("/organisations/me", { method: "PATCH", body: JSON.stringify(data) }),
  members: () => request<OrgMember[]>("/organisations/me/members"),
}
