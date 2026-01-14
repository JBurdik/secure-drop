import { Download, FolderInput, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Id } from "../../convex/_generated/dataModel";

interface FolderOption {
  _id: Id<"folders">;
  name: string;
}

interface SelectionActionBarProps {
  selectedCount: number;
  folders: FolderOption[];
  onDelete: () => void;
  onDownloadZip: () => void;
  onMoveToFolder: (folderId: Id<"folders">) => void;
  onClearSelection: () => void;
}

export function SelectionActionBar({
  selectedCount,
  folders,
  onDelete,
  onDownloadZip,
  onMoveToFolder,
  onClearSelection,
}: SelectionActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 sm:gap-2 rounded-lg border bg-card p-2 shadow-lg">
      <span className="text-sm font-medium px-2 whitespace-nowrap">
        {selectedCount} selected
      </span>

      <div className="h-4 w-px bg-border" />

      <Button
        variant="ghost"
        size="sm"
        onClick={onDownloadZip}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Download ZIP</span>
      </Button>

      {folders.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <FolderInput className="h-4 w-4" />
              <span className="hidden sm:inline">Move</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            {folders.map((folder) => (
              <DropdownMenuItem
                key={folder._id}
                onClick={() => onMoveToFolder(folder._id)}
              >
                {folder.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        className="gap-2 text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
        <span className="hidden sm:inline">Delete</span>
      </Button>

      <div className="h-4 w-px bg-border" />

      <Button
        variant="ghost"
        size="icon"
        onClick={onClearSelection}
        className="h-8 w-8"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
