import { useRef, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { attachmentsApi, type Attachment } from "@/services/api"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/context/AuthContext"
import { Paperclip, X, Upload, FileText, Image, Sheet } from "lucide-react"
import { cn } from "@/lib/utils"

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ contentType }: { contentType: string }) {
  if (contentType.startsWith("image/")) return <Image className="h-4 w-4 text-blue-500" />
  if (contentType.includes("sheet") || contentType.includes("excel")) return <Sheet className="h-4 w-4 text-emerald-500" />
  return <FileText className="h-4 w-4 text-muted-foreground" />
}

export function TaskAttachments({ taskId }: { taskId: string }) {
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const { toast } = useToast()
  const qc = useQueryClient()

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ["attachments", taskId],
    queryFn: () => attachmentsApi.list(taskId),
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => attachmentsApi.upload(taskId, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attachments", taskId] }),
    onError: (e: Error) => toast({ title: "Upload failed", description: e.message, variant: "destructive" }),
  })

  const deleteMutation = useMutation({
    mutationFn: (key: string) => attachmentsApi.delete(taskId, key),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attachments", taskId] }),
    onError: (e: Error) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  })

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach((f) => uploadMutation.mutate(f))
  }

  const canDelete = (att: Attachment) =>
    att.uploaded_by.id === user?.id || user?.role === "owner" || user?.role === "admin"

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Attachments{attachments.length > 0 ? ` (${attachments.length})` : ""}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-xs gap-1"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
        >
          <Upload className="h-3 w-3" />
          Upload
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Drop zone (visible when no files, or always) */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors mb-3",
          dragging ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-muted-foreground/40",
          uploadMutation.isPending && "opacity-50 pointer-events-none"
        )}
      >
        <Paperclip className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          {uploadMutation.isPending ? "Uploading…" : "Drop files here or click to upload"}
        </p>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">PDF, images, Word, Excel — up to 10 MB</p>
      </div>

      {/* File list */}
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : attachments.length > 0 ? (
        <div className="space-y-1.5">
          {attachments.map((att) => (
            <div key={att.key} className="group flex items-center gap-2 rounded-lg border px-3 py-2 bg-card hover:bg-muted/40 transition-colors">
              <FileIcon contentType={att.content_type} />
              <div className="flex-1 min-w-0">
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-foreground hover:text-primary transition-colors truncate block"
                  onClick={(e) => e.stopPropagation()}
                >
                  {att.name}
                </a>
                <p className="text-[10px] text-muted-foreground">
                  {formatBytes(att.size)} · {att.uploaded_by.name}
                </p>
              </div>
              {canDelete(att) && (
                <button
                  onClick={() => deleteMutation.mutate(att.key)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  aria-label="Delete attachment"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
