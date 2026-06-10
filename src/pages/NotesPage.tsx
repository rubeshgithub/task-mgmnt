import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { notesApi, type Note } from "@/services/api"
import { useAuth } from "@/context/AuthContext"
import { useNavigate } from "@tanstack/react-router"
import { useTheme } from "@/hooks/use-theme"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { NotificationBell } from "@/components/shared/NotificationBell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import {
  Sun, Moon, LogOut, Settings, Phone, FileText,
  ChevronDown, ChevronUp, Trash2, Clock, Plus, Pencil,
} from "lucide-react"

function formatDuration(seconds: number | null): string {
  if (!seconds) return ""
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function TranscriptView({ turns }: { turns: Note["transcript_object"] }) {
  return (
    <div className="space-y-2 pt-3 border-t mt-3">
      {turns.map((turn, i) => (
        <div key={i} className={cn("flex gap-2", turn.role === "user" ? "justify-end" : "justify-start")}>
          <div className={cn(
            "max-w-[80%] rounded-lg px-3 py-2 text-xs leading-relaxed",
            turn.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
          )}>
            <span className={cn(
              "block text-[10px] font-semibold mb-0.5 uppercase tracking-wide",
              turn.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
            )}>
              {turn.role === "user" ? "You" : "Agent"}
            </span>
            {turn.content}
          </div>
        </div>
      ))}
    </div>
  )
}

function VoiceNoteCard({ note, onDelete }: { note: Note; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const hasTurns = note.transcript_object.length > 0
  const hasTranscript = hasTurns || !!note.transcript

  return (
    <div className="bg-card rounded-xl border p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Phone className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {format(new Date(note.started_at ?? note.created_at), "MMM d, yyyy · h:mm a")}
            </p>
            {note.duration_seconds != null && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />{formatDuration(note.duration_seconds)}
              </p>
            )}
          </div>
        </div>
        <button onClick={onDelete} className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {note.summary
        ? <p className="text-sm text-muted-foreground leading-relaxed">{note.summary}</p>
        : <p className="text-xs text-muted-foreground/50 italic">No summary available</p>
      }

      {hasTranscript && (
        <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {expanded ? "Hide transcript" : "View full transcript"}
        </button>
      )}
      {expanded && hasTurns && <TranscriptView turns={note.transcript_object} />}
      {expanded && !hasTurns && note.transcript && (
        <pre className="pt-3 border-t mt-3 text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">{note.transcript}</pre>
      )}
    </div>
  )
}

function ManualNoteCard({ note, onEdit, onDelete }: { note: Note; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="bg-card rounded-xl border p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
            <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0">
            {note.title
              ? <p className="text-sm font-semibold truncate">{note.title}</p>
              : <p className="text-sm font-semibold text-muted-foreground italic">Untitled note</p>
            }
            <p className="text-xs text-muted-foreground">{format(new Date(note.created_at), "MMM d, yyyy · h:mm a")}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEdit} className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {note.body && (
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{note.body}</p>
      )}
    </div>
  )
}

interface NoteDialogProps {
  open: boolean
  initial?: Note | null
  onClose: () => void
  onSave: (data: { title?: string; body: string }) => Promise<void>
  isPending: boolean
}

function NoteDialog({ open, initial, onClose, onSave, isPending }: NoteDialogProps) {
  const [title, setTitle] = useState(initial?.title ?? "")
  const [body, setBody] = useState(initial?.body ?? "")

  const handleSave = async () => {
    await onSave({ title: title.trim() || undefined, body })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Note" : "New Note"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Input
            placeholder="Title (optional)"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <Textarea
            placeholder="Write your note here…"
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={8}
            className="resize-none"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!body.trim() || isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function NotesPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { theme, toggle: toggleTheme } = useTheme()
  const { toast } = useToast()
  const qc = useQueryClient()

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Note | null>(null)

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["notes"],
    queryFn: notesApi.list,
  })

  const createMutation = useMutation({
    mutationFn: notesApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notes"] }); toast({ title: "Note saved" }) },
    onError: (e: Error) => toast({ title: "Failed to save", description: e.message, variant: "destructive" }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title?: string; body?: string } }) => notesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notes"] }); toast({ title: "Note updated" }) },
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  })

  const deleteMutation = useMutation({
    mutationFn: notesApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notes"] }); toast({ title: "Note deleted", variant: "destructive" }) },
    onError: (e: Error) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  })

  const handleDelete = (id: string) => {
    if (!window.confirm("Delete this note?")) return
    deleteMutation.mutate(id)
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="bg-card border-b px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold leading-tight">{user?.org_name || "Task Management"}</h1>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <button onClick={() => navigate({ to: "/tasks" })} className="px-3 py-1 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground transition-colors">Tasks</button>
            <button onClick={() => navigate({ to: "/reminders" })} className="px-3 py-1 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground transition-colors">Reminders</button>
            <button className="px-3 py-1 text-xs font-medium rounded-md bg-background text-foreground shadow-sm">Notes</button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user && <span className="hidden sm:block text-xs text-muted-foreground">{user.name}</span>}
          <NotificationBell />
          <button onClick={toggleTheme} className="h-8 w-8 flex items-center justify-center rounded-md border border-input bg-background hover:bg-muted transition-colors" aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
          </button>
          <button onClick={() => navigate({ to: "/settings" })} className="h-8 w-8 flex items-center justify-center rounded-md border border-input bg-background hover:bg-muted transition-colors" aria-label="Settings">
            <Settings className="h-4 w-4 text-muted-foreground" />
          </button>
          <button onClick={() => { logout(); navigate({ to: "/login" }) }} className="h-8 w-8 flex items-center justify-center rounded-md border border-input bg-background hover:bg-muted transition-colors" aria-label="Sign out">
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />New Note
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {isLoading ? (
          <LoadingSpinner message="Loading notes…" />
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-24">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No notes yet</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Create a note manually, or call via Retell AI and say "take notes" to capture the transcript automatically.
            </p>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />New Note
            </Button>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-3">
            <p className="text-xs text-muted-foreground mb-4">
              {notes.length} note{notes.length !== 1 ? "s" : ""}
              {" · "}
              <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> voice</span>
              {" · "}
              <span className="inline-flex items-center gap-1"><FileText className="h-3 w-3" /> manual</span>
            </p>
            {notes.map(note =>
              note.source === "manual" ? (
                <ManualNoteCard
                  key={note.id}
                  note={note}
                  onEdit={() => setEditTarget(note)}
                  onDelete={() => handleDelete(note.id)}
                />
              ) : (
                <VoiceNoteCard
                  key={note.id}
                  note={note}
                  onDelete={() => handleDelete(note.id)}
                />
              )
            )}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <NoteDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={(data) => createMutation.mutateAsync(data).then(() => {})}
        isPending={createMutation.isPending}
      />

      {/* Edit dialog */}
      {editTarget && (
        <NoteDialog
          key={editTarget.id}
          open={!!editTarget}
          initial={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={(data) => updateMutation.mutateAsync({ id: editTarget.id, data }).then(() => {})}
          isPending={updateMutation.isPending}
        />
      )}
    </div>
  )
}
