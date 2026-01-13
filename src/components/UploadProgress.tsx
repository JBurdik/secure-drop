import type { UploadProgress as UploadProgressType } from "../types/upload";
import { X, Check, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "./ui/button";

interface UploadProgressProps {
  uploads: Map<string, UploadProgressType>;
  onClear: (id: string) => void;
}

export function UploadProgressList({ uploads, onClear }: UploadProgressProps) {
  if (uploads.size === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 space-y-2">
      {Array.from(uploads.values()).map((upload) => (
        <UploadProgressItem
          key={upload.id}
          upload={upload}
          onClear={() => onClear(upload.id)}
        />
      ))}
    </div>
  );
}

function UploadProgressItem({
  upload,
  onClear,
}: {
  upload: UploadProgressType;
  onClear: () => void;
}) {
  return (
    <div className="rounded-lg border bg-card p-3 shadow-lg">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {upload.status === "pending" && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {upload.status === "uploading" && (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
          {upload.status === "uploaded" && (
            <Check className="h-4 w-4 text-green-500" />
          )}
          {upload.status === "error" && (
            <AlertCircle className="h-4 w-4 text-destructive" />
          )}
          <span className="truncate text-sm font-medium">{upload.fileName}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={onClear}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {(upload.status === "uploading" || upload.status === "pending") && (
        <div className="mt-2">
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-150"
              style={{ width: `${upload.progress}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground mt-1 block">
            {upload.progress}%
          </span>
        </div>
      )}

      {upload.status === "error" && upload.error && (
        <p className="text-xs text-destructive mt-1">{upload.error}</p>
      )}
    </div>
  );
}
