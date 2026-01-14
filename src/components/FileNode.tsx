import { useDraggable, useDroppable } from "@dnd-kit/core";
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
  Box,
  HardDrive,
  Check,
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
  isSelected?: boolean;
  showCheckbox?: boolean;
  onSelect?: (e: React.MouseEvent) => void;
  onDelete?: () => void;
  onPreview?: () => void;
}

interface FileNodePreviewProps {
  name: string;
  size: number;
  mimeType: string;
  url: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(mimeType: string, fileName?: string) {
  // Check by extension first for better accuracy
  const ext = fileName?.split(".").pop()?.toLowerCase();

  // Executables and installers
  if (ext === "exe" || ext === "msi" || mimeType === "application/x-msdownload") return Box;
  if (ext === "dmg" || mimeType === "application/x-apple-diskimage") return HardDrive;
  if (ext === "app" || ext === "pkg" || ext === "deb" || ext === "rpm") return Box;

  // Media types
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.startsWith("video/")) return FileVideo;
  if (mimeType.startsWith("audio/")) return FileAudio;

  // Documents
  if (mimeType.startsWith("text/") || mimeType === "application/pdf")
    return FileText;

  // Archives
  if (
    mimeType.includes("zip") ||
    mimeType.includes("rar") ||
    mimeType.includes("tar") ||
    mimeType.includes("7z") ||
    mimeType.includes("gzip") ||
    ext === "zip" || ext === "rar" || ext === "7z" || ext === "tar" || ext === "gz"
  )
    return FileArchive;

  return File;
}

// Presentational component for DragOverlay
export function FileNodePreview({
  name,
  size,
  mimeType,
  url,
}: FileNodePreviewProps) {
  const Icon = getFileIcon(mimeType, name);
  const isImage = mimeType.startsWith("image/");

  return (
    <div className="w-28 sm:w-36 select-none rounded-lg border bg-card p-2 sm:p-3 shadow-xl scale-105 opacity-95 rotate-2">
      <div className="flex flex-col items-center gap-1 sm:gap-2">
        {isImage && url ? (
          <img
            src={url}
            alt={name}
            className="h-14 w-14 sm:h-20 sm:w-20 rounded object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 sm:h-20 sm:w-20 items-center justify-center rounded bg-muted">
            <Icon className="h-7 w-7 sm:h-10 sm:w-10 text-muted-foreground" />
          </div>
        )}
        <span className="w-full truncate text-center text-xs sm:text-sm font-medium">
          {name}
        </span>
        <span className="text-[10px] sm:text-xs text-muted-foreground">
          {formatBytes(size)}
        </span>
      </div>
    </div>
  );
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
  isSelected = false,
  showCheckbox = false,
  onSelect,
  onDelete,
  onPreview,
}: FileNodeProps) {
  const [imageError, setImageError] = useState(false);

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id,
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `file-drop-${id}`,
    data: { type: "file", id },
  });

  const style: React.CSSProperties = {
    position: "absolute",
    left: positionX,
    top: positionY,
    zIndex: isDragging ? 1000 : 1,
    transition: "box-shadow 0.2s, opacity 0.15s",
  };

  const Icon = getFileIcon(mimeType, name);
  const isImage = mimeType.startsWith("image/");
  const canPreview =
    isImage ||
    mimeType.startsWith("video/") ||
    mimeType.startsWith("audio/") ||
    mimeType === "application/pdf";

  return (
    <div
      ref={(node) => {
        setDragRef(node);
        setDropRef(node);
      }}
      style={style}
      className={cn(
        "group relative w-28 sm:w-36 select-none rounded-lg border bg-card p-2 sm:p-3 shadow-sm hover:shadow-md",
        isDragging && "opacity-40",
        isOver && "ring-2 ring-primary bg-primary/10",
        isSelected && "ring-2 ring-primary",
      )}
    >
      {/* Selection checkbox */}
      {showCheckbox && (
        <div
          className={cn(
            "absolute -left-1 -top-1 h-5 w-5 rounded border bg-card z-10",
            "flex items-center justify-center cursor-pointer",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            isSelected && "opacity-100 bg-primary border-primary"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(e);
          }}
        >
          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
        </div>
      )}
      {/* Drag handle - the main card body */}
      <div
        {...listeners}
        {...attributes}
        className="cursor-grab active:cursor-grabbing"
      >
        <div className="flex flex-col items-center gap-1 sm:gap-2">
          {isImage && url && !imageError ? (
            <img
              src={url}
              alt={name}
              className="h-14 w-14 sm:h-20 sm:w-20 rounded object-cover cursor-pointer"
              onError={() => setImageError(true)}
              onClick={(e) => {
                e.stopPropagation();
                if (onPreview) onPreview();
              }}
            />
          ) : (
            <div
              className="flex h-14 w-14 sm:h-20 sm:w-20 items-center justify-center rounded bg-muted cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (canPreview && onPreview) {
                  onPreview();
                }
              }}
            >
              <Icon className="h-7 w-7 sm:h-10 sm:w-10 text-muted-foreground" />
            </div>
          )}
          <span className="w-full truncate text-center text-xs sm:text-sm font-medium">
            {name}
          </span>
          <span className="text-[10px] sm:text-xs text-muted-foreground">
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
