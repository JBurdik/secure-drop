import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  File,
  FileImage,
  FileVideo,
  FileAudio,
  FileText,
  FileArchive,
  Download,
  Trash2,
  Eye,
  MoreVertical,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface FileNodeProps {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  positionX: number;
  positionY: number;
  url: string | null;
  isOwner: boolean;
  onDelete?: () => void;
  onPreview?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.startsWith("video/")) return FileVideo;
  if (mimeType.startsWith("audio/")) return FileAudio;
  if (mimeType.startsWith("text/") || mimeType === "application/pdf")
    return FileText;
  if (
    mimeType.includes("zip") ||
    mimeType.includes("rar") ||
    mimeType.includes("tar")
  )
    return FileArchive;
  return File;
}

export function FileNode({
  id,
  name,
  size,
  mimeType,
  positionX,
  positionY,
  url,
  isOwner,
  onDelete,
  onPreview,
}: FileNodeProps) {
  const [showThumbnail, setShowThumbnail] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id,
    });

  const style = {
    position: "absolute" as const,
    left: positionX,
    top: positionY,
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 1000 : 1,
  };

  const Icon = getFileIcon(mimeType);
  const isImage = mimeType.startsWith("image/");
  const canPreview =
    isImage ||
    mimeType.startsWith("video/") ||
    mimeType.startsWith("audio/") ||
    mimeType === "application/pdf";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative w-28 select-none rounded-lg border bg-card p-2 shadow-sm transition-all hover:shadow-md",
        isDragging && "opacity-50 shadow-lg",
      )}
    >
      {/* Drag handle - the main card body */}
      <div
        {...listeners}
        {...attributes}
        className="cursor-grab active:cursor-grabbing"
      >
        <div className="flex flex-col items-center gap-1">
          {showThumbnail && isImage && url ? (
            <img
              src={url}
              alt={name}
              className="h-14 w-14 rounded object-cover"
              onError={() => setShowThumbnail(false)}
            />
          ) : (
            <div
              className="flex h-14 w-14 items-center justify-center rounded bg-muted cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (isImage && url) {
                  setShowThumbnail(true);
                } else if (canPreview && onPreview) {
                  onPreview();
                }
              }}
            >
              <Icon className="h-7 w-7 text-muted-foreground" />
            </div>
          )}
          <span className="w-full truncate text-center text-xs font-medium">
            {name}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatBytes(size)}
          </span>
        </div>
      </div>

      {/* Menu button - separate from drag handle */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute -right-1 -top-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-card border shadow-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {url && (
            <DropdownMenuItem asChild>
              <a href={url} download={name} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download
              </a>
            </DropdownMenuItem>
          )}
          {canPreview && onPreview && (
            <DropdownMenuItem
              onClick={onPreview}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Preview
            </DropdownMenuItem>
          )}
          {isOwner && onDelete && (
            <DropdownMenuItem
              onClick={onDelete}
              className="flex items-center gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
