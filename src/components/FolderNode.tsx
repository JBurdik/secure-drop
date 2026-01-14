import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  Folder,
  MoreVertical,
  Trash2,
  Pencil,
  Palette,
  // Icon options
  FolderHeart,
  FolderCog,
  FolderCode,
  FolderArchive,
  FolderKey,
  FolderGit2,
  Image,
  Music,
  Video,
  FileText,
  Download,
  Star,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Color options
const FOLDER_COLORS = {
  amber: { bg: "bg-amber-500", text: "text-amber-500", label: "Amber" },
  blue: { bg: "bg-blue-500", text: "text-blue-500", label: "Blue" },
  green: { bg: "bg-green-500", text: "text-green-500", label: "Green" },
  red: { bg: "bg-red-500", text: "text-red-500", label: "Red" },
  purple: { bg: "bg-purple-500", text: "text-purple-500", label: "Purple" },
  pink: { bg: "bg-pink-500", text: "text-pink-500", label: "Pink" },
  orange: { bg: "bg-orange-500", text: "text-orange-500", label: "Orange" },
  cyan: { bg: "bg-cyan-500", text: "text-cyan-500", label: "Cyan" },
} as const;

// Icon options
const FOLDER_ICONS: { name: string; icon: LucideIcon; label: string }[] = [
  { name: "folder", icon: Folder, label: "Default" },
  { name: "heart", icon: FolderHeart, label: "Favorites" },
  { name: "cog", icon: FolderCog, label: "Settings" },
  { name: "code", icon: FolderCode, label: "Code" },
  { name: "archive", icon: FolderArchive, label: "Archive" },
  { name: "key", icon: FolderKey, label: "Secure" },
  { name: "git", icon: FolderGit2, label: "Git" },
  { name: "image", icon: Image, label: "Images" },
  { name: "music", icon: Music, label: "Music" },
  { name: "video", icon: Video, label: "Videos" },
  { name: "document", icon: FileText, label: "Documents" },
  { name: "download", icon: Download, label: "Downloads" },
  { name: "star", icon: Star, label: "Important" },
];

function getIconComponent(iconName?: string): LucideIcon {
  const found = FOLDER_ICONS.find((i) => i.name === iconName);
  return found?.icon || Folder;
}

function getColorClasses(colorName?: string) {
  const color = colorName as keyof typeof FOLDER_COLORS;
  return FOLDER_COLORS[color] || FOLDER_COLORS.amber;
}

interface FolderNodeProps {
  id: string;
  name: string;
  positionX: number;
  positionY: number;
  fileCount: number;
  color?: string;
  icon?: string;
  isOwner: boolean;
  onDelete?: () => void;
  onRename?: (name: string) => void;
  onUpdateFolder?: (updates: { color?: string; icon?: string }) => void;
  onClick?: () => void;
}

export function FolderNode({
  id,
  name,
  positionX,
  positionY,
  fileCount,
  color,
  icon,
  isOwner,
  onDelete,
  onRename,
  onUpdateFolder,
  onClick,
}: FolderNodeProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(name);

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `folder-${id}`,
    data: { type: "folder", id },
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `folder-drop-${id}`,
    data: { type: "folder", id },
  });

  const style: React.CSSProperties = {
    position: "absolute",
    left: positionX,
    top: positionY,
    zIndex: isDragging ? 1000 : 1,
    transition: "box-shadow 0.2s, opacity 0.15s",
  };

  const handleRename = () => {
    if (newName.trim() && newName !== name && onRename) {
      onRename(newName.trim());
    }
    setIsRenaming(false);
  };

  const IconComponent = getIconComponent(icon);
  const colorClasses = getColorClasses(color);

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
      )}
    >
      {/* Drag handle */}
      <div
        {...listeners}
        {...attributes}
        className="cursor-grab active:cursor-grabbing"
        onDoubleClick={onClick}
      >
        <div className="flex flex-col items-center gap-1 sm:gap-2">
          <div className={cn(
            "flex h-14 w-14 sm:h-20 sm:w-20 items-center justify-center rounded bg-muted",
            isOver && "bg-primary/20"
          )}>
            <IconComponent
              className={cn(
                "h-8 w-8 sm:h-12 sm:w-12",
                isOver ? "text-primary" : colorClasses.text
              )}
              fill="currentColor"
            />
          </div>
          {isRenaming ? (
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") {
                  setNewName(name);
                  setIsRenaming(false);
                }
              }}
              className="h-6 text-xs text-center"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="w-full truncate text-center text-xs sm:text-sm font-medium">
              {name}
            </span>
          )}
          <span className="text-[10px] sm:text-xs text-muted-foreground">
            {fileCount} {fileCount === 1 ? "file" : "files"}
          </span>
        </div>
      </div>

      {/* Menu button */}
      {isOwner && (
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
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => setIsRenaming(true)}
              className="flex items-center gap-2"
            >
              <Pencil className="h-4 w-4" />
              Rename
            </DropdownMenuItem>

            {/* Color submenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Color
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {Object.entries(FOLDER_COLORS).map(([key, value]) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => onUpdateFolder?.({ color: key })}
                    className="flex items-center gap-2"
                  >
                    <div className={cn("h-4 w-4 rounded-full", value.bg)} />
                    {value.label}
                    {color === key && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {/* Icon submenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                Icon
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-64 overflow-y-auto">
                {FOLDER_ICONS.map((item) => (
                  <DropdownMenuItem
                    key={item.name}
                    onClick={() => onUpdateFolder?.({ icon: item.name })}
                    className="flex items-center gap-2"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                    {icon === item.name && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />

            {onDelete && (
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
      )}
    </div>
  );
}

// Preview component for DragOverlay
export function FolderNodePreview({
  name,
  fileCount,
  color,
  icon,
}: {
  name: string;
  fileCount: number;
  color?: string;
  icon?: string;
}) {
  const IconComponent = getIconComponent(icon);
  const colorClasses = getColorClasses(color);

  return (
    <div className="w-28 sm:w-36 select-none rounded-lg border bg-card p-2 sm:p-3 shadow-xl scale-105 opacity-95 rotate-2">
      <div className="flex flex-col items-center gap-1 sm:gap-2">
        <div className="flex h-14 w-14 sm:h-20 sm:w-20 items-center justify-center rounded bg-muted">
          <IconComponent
            className={cn("h-8 w-8 sm:h-12 sm:w-12", colorClasses.text)}
            fill="currentColor"
          />
        </div>
        <span className="w-full truncate text-center text-xs sm:text-sm font-medium">
          {name}
        </span>
        <span className="text-[10px] sm:text-xs text-muted-foreground">
          {fileCount} {fileCount === 1 ? "file" : "files"}
        </span>
      </div>
    </div>
  );
}
