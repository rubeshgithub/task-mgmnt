import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { commentsApi } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { UserAvatar } from "./UserAvatar"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/context/AuthContext"
import { X, Send } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export function TaskComments({ taskId }: { taskId: string }) {
  const [text, setText] = useState("")
  const { user } = useAuth()
  const { toast } = useToast()
  const qc = useQueryClient()

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["comments", taskId],
    queryFn: () => commentsApi.list(taskId),
  })

  const addMutation = useMutation({
    mutationFn: (t: string) => commentsApi.create(taskId, t),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", taskId] })
      setText("")
    },
    onError: (e: Error) => toast({ title: "Failed to post comment", description: e.message, variant: "destructive" }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => commentsApi.delete(taskId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", taskId] }),
    onError: (e: Error) => toast({ title: "Failed to delete comment", description: e.message, variant: "destructive" }),
  })

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    addMutation.mutate(trimmed)
  }

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Comments{comments.length > 0 ? ` (${comments.length})` : ""}
      </p>

      {/* Comment list */}
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground mb-3">No comments yet. Be the first.</p>
      ) : (
        <div className="space-y-2.5 mb-3">
          {comments.map((c) => {
            const canDelete =
              c.created_by.id === user?.id ||
              user?.role === "owner" ||
              user?.role === "admin"
            return (
              <div key={c.id} className="flex gap-2 group">
                <div className="shrink-0 mt-0.5"><UserAvatar name={c.created_by.name} email={c.created_by.email} size="xs" /></div>
                <div className="flex-1 min-w-0 bg-muted/50 rounded-lg px-3 py-2">
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="text-xs font-semibold truncate">{c.created_by.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {canDelete && (
                      <button
                        onClick={() => deleteMutation.mutate(c.id)}
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        aria-label="Delete comment"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs mt-0.5 leading-relaxed whitespace-pre-wrap">{c.text}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add comment input */}
      <div className="flex gap-2 items-end">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment… (Enter to post, Shift+Enter for newline)"
          rows={2}
          className="text-xs resize-none flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSubmit()
            }
          }}
          disabled={addMutation.isPending}
        />
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!text.trim() || addMutation.isPending}
          className="h-8 w-8 p-0 shrink-0"
          aria-label="Post comment"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
