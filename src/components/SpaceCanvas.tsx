import { useCallback, useState, useRef } from "react";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  type DragMoveEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  pointerWithin,
} from "@dnd-kit/core";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useOptimisticUpdateFilePosition } from "@/hooks/useOptimisticFilePosition";
import { useOptimisticUpdateFolderPosition } from "@/hooks/useOptimisticFolderPosition";
import { useOptimisticMoveFileToFolder } from "@/hooks/useOptimisticMoveFileToFolder";
import { FileNode, FileNodePreview } from "./FileNode";
import { FolderNode, FolderNodePreview } from "./FolderNode";
import { FilePreviewModal } from "./FilePreviewModal";
import { Upload, Plus, FolderPlus, X, ArrowLeft, LayoutGrid, List, Loader2 } from "lucide-react";
import type { UploadProgress } from "@/types/upload";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Grid configuration
const GRID_SIZE = 160; // Grid cell size in pixels
const GRID_PADDING = 16; // Padding inside canvas

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE + GRID_PADDING;
}

interface FileData {
  _id: Id<"files">;
  name: string;
  size: number;
  mimeType: string;
  positionX: number;
  positionY: number;
  folderId?: Id<"folders">;
  url: string | null;
}

interface FolderData {
  _id: Id<"folders">;
  name: string;
  positionX: number;
  positionY: number;
  color?: string;
  icon?: string;
}

interface SpaceCanvasProps {
  spaceId: Id<"spaces">;
  spaceCode: string; // The short spaceId code for queries
  files: FileData[];
  folders: FolderData[];
  isOwner: boolean;
  allowUploads: boolean;
  uploads: Map<string, UploadProgress>;
  onUpload: (file: File, x: number, y: number, folderId?: Id<"folders">) => Promise<void>;
}

type ActiveItem =
  | { type: "file"; data: FileData }
  | { type: "folder"; data: FolderData & { fileCount: number; color?: string; icon?: string } };

export function SpaceCanvas({
  spaceId,
  spaceCode,
  files,
  folders,
  isOwner,
  allowUploads,
  uploads,
  onUpload,
}: SpaceCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderFileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeItem, setActiveItem] = useState<ActiveItem | null>(null);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("New Folder");
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [isDraggingItem, setIsDraggingItem] = useState(false);
  const [ghostPosition, setGhostPosition] = useState<{ x: number; y: number } | null>(null);
  const [openFolder, setOpenFolder] = useState<FolderData | null>(null);
  const [folderViewMode, setFolderViewMode] = useState<"grid" | "list">("grid");

  const updateFilePosition = useOptimisticUpdateFilePosition(spaceId);
  const updateFolderPosition = useOptimisticUpdateFolderPosition(spaceCode);
  const moveFileToFolder = useOptimisticMoveFileToFolder(spaceId);
  const deleteFile = useMutation(api.files.deleteFile);
  const deleteFolder = useMutation(api.folders.deleteFolder);
  const createFolder = useMutation(api.folders.createFolder);
  const createFolderFromFiles = useMutation(api.folders.createFolderFromFiles);
  const renameFolder = useMutation(api.folders.renameFolder);
  const updateFolder = useMutation(api.folders.updateFolder);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 3 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 150, tolerance: 5 },
  });
  const sensors = useSensors(mouseSensor, touchSensor);

  // Count files in each folder
  const folderFileCounts = folders.reduce((acc, folder) => {
    acc[folder._id] = files.filter((f) => f.folderId === folder._id).length;
    return acc;
  }, {} as Record<string, number>);

  // Files not in any folder
  const canvasFiles = files.filter((f) => !f.folderId);

  // Uploading files on canvas (not in a folder)
  const canvasUploads = Array.from(uploads.values()).filter(
    (u) => !u.folderId && u.positionX !== undefined && u.status !== "uploaded"
  );

  // Uploading files in the open folder
  const folderUploads = openFolder
    ? Array.from(uploads.values()).filter(
        (u) => u.folderId === openFolder._id && u.status !== "uploaded"
      )
    : [];

  // Files in the open folder
  const openFolderFiles = openFolder
    ? files.filter((f) => f.folderId === openFolder._id)
    : [];

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const id = event.active.id as string;
      setIsDraggingItem(true);

      if (id.startsWith("folder-")) {
        const folderId = id.replace("folder-", "") as Id<"folders">;
        const folder = folders.find((f) => f._id === folderId);
        if (folder) {
          setActiveItem({
            type: "folder",
            data: {
              ...folder,
              fileCount: folderFileCounts[folder._id] || 0,
              color: folder.color,
              icon: folder.icon,
            },
          });
          setGhostPosition({ x: folder.positionX, y: folder.positionY });
        }
      } else {
        const file = files.find((f) => f._id === id);
        if (file) {
          setActiveItem({ type: "file", data: file });
          setGhostPosition({ x: file.positionX, y: file.positionY });
        }
      }
    },
    [files, folders, folderFileCounts],
  );

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      const { active, delta } = event;
      const id = active.id as string;

      if (!canvasRef.current) return;

      const canvasRect = canvasRef.current.getBoundingClientRect();
      let originalX = 0;
      let originalY = 0;

      if (id.startsWith("folder-")) {
        const folderId = id.replace("folder-", "") as Id<"folders">;
        const folder = folders.find((f) => f._id === folderId);
        if (folder) {
          originalX = folder.positionX;
          originalY = folder.positionY;
        }
      } else {
        const file = files.find((f) => f._id === id);
        if (file) {
          originalX = file.positionX;
          originalY = file.positionY;
        }
      }

      const newX = snapToGrid(originalX + delta.x);
      const newY = snapToGrid(originalY + delta.y);

      // Clamp within bounds
      const clampedX = Math.min(Math.max(GRID_PADDING, newX), canvasRect.width - GRID_SIZE);
      const clampedY = Math.min(Math.max(GRID_PADDING, newY), canvasRect.height - GRID_SIZE);

      setGhostPosition({ x: clampedX, y: clampedY });
    },
    [files, folders],
  );

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    const overId = over?.id ? String(over.id) : null;

    // Check for folder drop target
    if (overId?.startsWith("folder-drop-")) {
      setDragOverFolderId(overId.replace("folder-drop-", ""));
    } else {
      setDragOverFolderId(null);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, delta, over } = event;
      const id = active.id as string;
      const overId = over?.id ? String(over.id) : null;

      // Reset all drag states
      setActiveItem(null);
      setDragOverFolderId(null);
      setIsDraggingItem(false);
      setGhostPosition(null);

      if (!canvasRef.current) return;

      // Check if dropped on a folder (only files can be dropped into folders)
      if (overId?.startsWith("folder-drop-")) {
        const folderId = overId.replace("folder-drop-", "") as Id<"folders">;

        // Only files can be dropped into folders, folders cannot
        if (!id.startsWith("folder-")) {
          const fileId = id as Id<"files">;
          moveFileToFolder({ fileId, folderId });
          return;
        }
        // Folder dropped on folder - just ignore (no action)
        return;
      }

      // Check if file dropped on file - create folder with both
      if (overId?.startsWith("file-drop-") && !id.startsWith("folder-")) {
        const targetFileId = overId.replace("file-drop-", "") as Id<"files">;
        const draggedFileId = id as Id<"files">;

        // Don't create folder if dropping on self
        if (targetFileId !== draggedFileId) {
          const targetFile = files.find((f) => f._id === targetFileId);
          if (targetFile) {
            createFolderFromFiles({
              spaceId,
              fileId1: draggedFileId,
              fileId2: targetFileId,
              positionX: targetFile.positionX,
              positionY: targetFile.positionY,
            });
          }
          return;
        }
      }

      const canvasRect = canvasRef.current.getBoundingClientRect();

      if (id.startsWith("folder-")) {
        // Handle folder drag (just position update, no folder-over-folder)
        const folderId = id.replace("folder-", "") as Id<"folders">;
        const folder = folders.find((f) => f._id === folderId);

        if (folder && delta) {
          const newX = snapToGrid(folder.positionX + delta.x);
          const newY = snapToGrid(folder.positionY + delta.y);

          // Clamp within bounds
          const clampedX = Math.min(Math.max(GRID_PADDING, newX), canvasRect.width - GRID_SIZE);
          const clampedY = Math.min(Math.max(GRID_PADDING, newY), canvasRect.height - GRID_SIZE);

          updateFolderPosition({
            folderId,
            positionX: clampedX,
            positionY: clampedY,
          });
        }
      } else {
        // Handle file drag
        const fileId = id as Id<"files">;
        const file = files.find((f) => f._id === fileId);

        if (file && delta) {
          const newX = snapToGrid(file.positionX + delta.x);
          const newY = snapToGrid(file.positionY + delta.y);

          // Clamp within bounds
          const clampedX = Math.min(Math.max(GRID_PADDING, newX), canvasRect.width - GRID_SIZE);
          const clampedY = Math.min(Math.max(GRID_PADDING, newY), canvasRect.height - GRID_SIZE);

          updateFilePosition({
            fileId,
            positionX: clampedX,
            positionY: clampedY,
          });

          // If file was in a folder and dropped on canvas, remove from folder
          if (file.folderId && !dragOverFolderId) {
            moveFileToFolder({ fileId, folderId: undefined });
          }
        }
      }
    },
    [files, folders, updateFilePosition, updateFolderPosition, moveFileToFolder, createFolderFromFiles, spaceId, dragOverFolderId],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);

      if (!allowUploads && !isOwner) return;

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length === 0) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = snapToGrid(e.clientX - rect.left);
      const y = snapToGrid(e.clientY - rect.top);

      setUploading(true);
      try {
        // Upload all files in parallel
        await Promise.all(
          droppedFiles.map((file, i) => {
            const col = i % 4;
            const row = Math.floor(i / 4);
            return onUpload(file, x + col * GRID_SIZE, y + row * GRID_SIZE);
          })
        );
      } finally {
        setUploading(false);
      }
    },
    [allowUploads, isOwner, onUpload],
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      if (selectedFiles.length === 0) return;

      setUploading(true);
      try {
        // Upload all files in parallel
        await Promise.all(
          selectedFiles.map((file, i) => {
            const col = i % 4;
            const row = Math.floor(i / 4);
            return onUpload(
              file,
              GRID_PADDING + col * GRID_SIZE,
              GRID_PADDING + row * GRID_SIZE
            );
          })
        );
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [onUpload],
  );

  const handleFolderFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      if (selectedFiles.length === 0 || !openFolder) return;

      setUploading(true);
      try {
        // Upload all files in parallel
        await Promise.all(
          selectedFiles.map((file) => onUpload(file, 0, 0, openFolder._id))
        );
      } finally {
        setUploading(false);
        if (folderFileInputRef.current) {
          folderFileInputRef.current.value = "";
        }
      }
    },
    [onUpload, openFolder],
  );

  const handleExternalDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (allowUploads || isOwner) {
        setIsDraggingOver(true);
      }
    },
    [allowUploads, isOwner],
  );

  const handleDragLeave = useCallback(() => {
    setIsDraggingOver(false);
  }, []);

  const handleDeleteFile = useCallback(
    async (fileId: Id<"files">) => {
      if (confirm("Delete this file?")) {
        await deleteFile({ fileId });
      }
    },
    [deleteFile],
  );

  const handleDeleteFolder = useCallback(
    async (folderId: Id<"folders">) => {
      if (confirm("Delete this folder? Files inside will be moved to the canvas.")) {
        await deleteFolder({ folderId });
        if (openFolder?._id === folderId) {
          setOpenFolder(null);
        }
      }
    },
    [deleteFolder, openFolder],
  );

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) return;

    // Find an empty grid position
    const occupiedPositions = new Set(
      [...folders, ...canvasFiles].map((item) => `${item.positionX},${item.positionY}`)
    );

    let x = GRID_PADDING;
    let y = GRID_PADDING;

    // Find first available grid position
    while (occupiedPositions.has(`${x},${y}`)) {
      x += GRID_SIZE;
      if (x > GRID_SIZE * 4) {
        x = GRID_PADDING;
        y += GRID_SIZE;
      }
    }

    await createFolder({
      spaceId,
      name: newFolderName.trim(),
      positionX: x,
      positionY: y,
    });

    setShowNewFolderDialog(false);
    setNewFolderName("New Folder");
  }, [newFolderName, folders, canvasFiles, createFolder, spaceId]);

  const handleRenameFolder = useCallback(
    async (folderId: Id<"folders">, name: string) => {
      await renameFolder({ folderId, name });
    },
    [renameFolder],
  );

  const handleUpdateFolder = useCallback(
    async (folderId: Id<"folders">, updates: { color?: string; icon?: string }) => {
      await updateFolder({ folderId, ...updates });
    },
    [updateFolder],
  );

  const handleRemoveFromFolder = useCallback(
    async (fileId: Id<"files">) => {
      await moveFileToFolder({ fileId, folderId: undefined });
    },
    [moveFileToFolder],
  );

  const canUpload = allowUploads || isOwner;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={folderFileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFolderFileSelect}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div
          ref={canvasRef}
          onDrop={handleDrop}
          onDragOver={handleExternalDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "relative min-h-[400px] sm:min-h-[500px] w-full rounded-lg border-2 border-dashed transition-colors overflow-hidden",
            isDraggingOver && canUpload && "border-primary bg-primary/5",
            isDraggingItem && "bg-muted/50",
            !canUpload && "border-muted",
            !isDraggingItem && "bg-muted/30",
          )}
          style={{
            backgroundImage: isDraggingItem
              ? `
                linear-gradient(to right, hsl(var(--primary) / 0.3) 1px, transparent 1px),
                linear-gradient(to bottom, hsl(var(--primary) / 0.3) 1px, transparent 1px)
              `
              : `
                linear-gradient(to right, hsl(var(--border) / 0.2) 1px, transparent 1px),
                linear-gradient(to bottom, hsl(var(--border) / 0.2) 1px, transparent 1px)
              `,
            backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
            backgroundPosition: `${GRID_PADDING}px ${GRID_PADDING}px`,
          }}
        >
          {/* Ghost preview showing snap position */}
          {isDraggingItem && ghostPosition && !dragOverFolderId && (
            <div
              className="absolute pointer-events-none border-2 border-dashed border-primary rounded-lg bg-primary/10 transition-all duration-75"
              style={{
                left: ghostPosition.x,
                top: ghostPosition.y,
                width: 144,
                height: 140,
              }}
            />
          )}

          {canvasFiles.length === 0 && folders.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <Upload className="mb-2 h-12 w-12" />
              <p className="text-lg font-medium">
                {canUpload ? "Drop files here" : "No files yet"}
              </p>
              {canUpload && (
                <>
                  <p className="text-sm">or drag and drop to upload</p>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {uploading ? "Uploading..." : "Add Files"}
                    </Button>
                    {isOwner && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowNewFolderDialog(true)}
                      >
                        <FolderPlus className="mr-2 h-4 w-4" />
                        New Folder
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {(canvasFiles.length > 0 || folders.length > 0) && canUpload && (
            <div className="absolute bottom-4 right-4 z-10 flex gap-2">
              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewFolderDialog(true)}
                >
                  <FolderPlus className="mr-2 h-4 w-4" />
                  New Folder
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Plus className="mr-2 h-4 w-4" />
                {uploading ? "Uploading..." : "Add Files"}
              </Button>
            </div>
          )}

          {/* Render folders */}
          {folders.map((folder) => (
            <FolderNode
              key={folder._id}
              id={folder._id}
              name={folder.name}
              positionX={folder.positionX}
              positionY={folder.positionY}
              fileCount={folderFileCounts[folder._id] || 0}
              color={folder.color}
              icon={folder.icon}
              isOwner={isOwner}
              onDelete={() => handleDeleteFolder(folder._id)}
              onRename={(name) => handleRenameFolder(folder._id, name)}
              onUpdateFolder={(updates) => handleUpdateFolder(folder._id, updates)}
              onClick={() => setOpenFolder(folder)}
            />
          ))}

          {/* Render files (not in folders) */}
          {canvasFiles.map((file) => (
            <FileNode
              key={file._id}
              id={file._id}
              name={file.name}
              size={file.size}
              mimeType={file.mimeType}
              positionX={file.positionX}
              positionY={file.positionY}
              url={file.url}
              isOwner={isOwner}
              onDelete={() => handleDeleteFile(file._id)}
              onPreview={() => setPreviewFile(file)}
            />
          ))}

          {/* Render uploading files */}
          {canvasUploads.map((upload) => (
            <UploadingFileNode
              key={upload.id}
              fileName={upload.fileName}
              progress={upload.progress}
              status={upload.status}
              positionX={upload.positionX!}
              positionY={upload.positionY!}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeItem?.type === "file" ? (
            <FileNodePreview
              name={activeItem.data.name}
              size={activeItem.data.size}
              mimeType={activeItem.data.mimeType}
              url={activeItem.data.url}
            />
          ) : activeItem?.type === "folder" ? (
            <FolderNodePreview
              name={activeItem.data.name}
              fileCount={activeItem.data.fileCount}
              color={activeItem.data.color}
              icon={activeItem.data.icon}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />

      {/* New Folder Dialog */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder();
              }}
              className="mt-2"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Open Folder Modal */}
      <Dialog open={!!openFolder} onOpenChange={(open) => !open && setOpenFolder(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setOpenFolder(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                {openFolder?.name}
              </DialogTitle>
              <div className="flex items-center gap-1 border rounded-lg p-0.5">
                <Button
                  variant={folderViewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setFolderViewMode("grid")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={folderViewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setFolderViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto py-4">
            {openFolderFiles.length === 0 && folderUploads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Upload className="mb-2 h-8 w-8" />
                <p>No files in this folder</p>
                {canUpload && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => folderFileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {uploading ? "Uploading..." : "Add Files"}
                  </Button>
                )}
              </div>
            ) : folderViewMode === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {openFolderFiles.map((file) => (
                  <div
                    key={file._id}
                    className="group relative rounded-lg border bg-card p-3 hover:shadow-md transition-shadow"
                  >
                    <FolderFileItem
                      file={file}
                      isOwner={isOwner}
                      onDelete={() => handleDeleteFile(file._id)}
                      onPreview={() => setPreviewFile(file)}
                      onRemoveFromFolder={() => handleRemoveFromFolder(file._id)}
                    />
                  </div>
                ))}
                {folderUploads.map((upload) => (
                  <UploadingFolderFileItem
                    key={upload.id}
                    fileName={upload.fileName}
                    progress={upload.progress}
                    status={upload.status}
                    viewMode="grid"
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {openFolderFiles.map((file) => (
                  <FolderFileListItem
                    key={file._id}
                    file={file}
                    isOwner={isOwner}
                    onDelete={() => handleDeleteFile(file._id)}
                    onPreview={() => setPreviewFile(file)}
                    onRemoveFromFolder={() => handleRemoveFromFolder(file._id)}
                  />
                ))}
                {folderUploads.map((upload) => (
                  <UploadingFolderFileItem
                    key={upload.id}
                    fileName={upload.fileName}
                    progress={upload.progress}
                    status={upload.status}
                    viewMode="list"
                  />
                ))}
              </div>
            )}
          </div>
          {(openFolderFiles.length > 0 || folderUploads.length > 0) && canUpload && (
            <div className="border-t pt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => folderFileInputRef.current?.click()}
                disabled={uploading}
              >
                <Plus className="mr-2 h-4 w-4" />
                {uploading ? "Uploading..." : "Add Files"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Component for files inside folder modal
function FolderFileItem({
  file,
  isOwner,
  onDelete,
  onPreview,
  onRemoveFromFolder,
}: {
  file: FileData;
  isOwner: boolean;
  onDelete: () => void;
  onPreview: () => void;
  onRemoveFromFolder: () => void;
}) {
  const isImage = file.mimeType.startsWith("image/");
  const canPreview =
    isImage ||
    file.mimeType.startsWith("video/") ||
    file.mimeType.startsWith("audio/") ||
    file.mimeType === "application/pdf";

  return (
    <>
      <div
        className="cursor-pointer"
        onClick={() => canPreview && onPreview()}
      >
        {isImage && file.url ? (
          <img
            src={file.url}
            alt={file.name}
            className="w-full h-20 object-cover rounded mb-2"
          />
        ) : (
          <div className="w-full h-20 bg-muted rounded mb-2 flex items-center justify-center">
            <span className="text-2xl">📄</span>
          </div>
        )}
        <p className="text-sm font-medium truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">
          {(file.size / 1024).toFixed(1)} KB
        </p>
      </div>
      {isOwner && (
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <Button
            variant="secondary"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveFromFolder();
            }}
            title="Move to canvas"
          >
            <ArrowLeft className="h-3 w-3" />
          </Button>
          <Button
            variant="destructive"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      {file.url && (
        <a
          href={file.url}
          download={file.name}
          className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <Button variant="secondary" size="icon" className="h-6 w-6">
            <span className="text-xs">⬇</span>
          </Button>
        </a>
      )}
    </>
  );
}

// Component for uploading files on canvas
function UploadingFileNode({
  fileName,
  progress,
  status,
  positionX,
  positionY,
}: {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "uploaded" | "error";
  positionX: number;
  positionY: number;
}) {
  const style: React.CSSProperties = {
    position: "absolute",
    left: positionX,
    top: positionY,
    zIndex: 2,
  };

  return (
    <div
      style={style}
      className="w-28 sm:w-36 select-none rounded-lg border bg-card p-2 sm:p-3 shadow-sm"
    >
      <div className="flex flex-col items-center gap-1 sm:gap-2">
        <div className="flex h-14 w-14 sm:h-20 sm:w-20 items-center justify-center rounded bg-muted">
          <Loader2 className="h-7 w-7 sm:h-10 sm:w-10 text-primary animate-spin" />
        </div>
        <span className="w-full truncate text-center text-xs sm:text-sm font-medium">
          {fileName}
        </span>
        <div className="w-full">
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 block text-center">
            {status === "pending" ? "Waiting..." : `${progress}%`}
          </span>
        </div>
      </div>
    </div>
  );
}

// List view component for files inside folder modal
function FolderFileListItem({
  file,
  isOwner,
  onDelete,
  onPreview,
  onRemoveFromFolder,
}: {
  file: FileData;
  isOwner: boolean;
  onDelete: () => void;
  onPreview: () => void;
  onRemoveFromFolder: () => void;
}) {
  const isImage = file.mimeType.startsWith("image/");
  const canPreview =
    isImage ||
    file.mimeType.startsWith("video/") ||
    file.mimeType.startsWith("audio/") ||
    file.mimeType === "application/pdf";

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="group flex items-center gap-3 p-2 rounded-lg border bg-card hover:shadow-md transition-shadow">
      {isImage && file.url ? (
        <img
          src={file.url}
          alt={file.name}
          className="w-12 h-12 object-cover rounded shrink-0 cursor-pointer"
          onClick={() => canPreview && onPreview()}
        />
      ) : (
        <div
          className="w-12 h-12 bg-muted rounded flex items-center justify-center shrink-0 cursor-pointer"
          onClick={() => canPreview && onPreview()}
        >
          <span className="text-xl">📄</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {file.url && (
          <a href={file.url} download={file.name} onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <span className="text-sm">⬇</span>
            </Button>
          </a>
        )}
        {isOwner && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onRemoveFromFolder}
              title="Move to canvas"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// Component for uploading files in folder (list item)
function UploadingFolderFileItem({
  fileName,
  progress,
  status,
  viewMode,
}: {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "uploaded" | "error";
  viewMode: "grid" | "list";
}) {
  if (viewMode === "list") {
    return (
      <div className="flex items-center gap-3 p-2 rounded-lg border bg-card">
        <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{fileName}</p>
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {status === "pending" ? "Waiting..." : `${progress}%`}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="w-full h-20 bg-muted rounded mb-2 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
      <p className="text-sm font-medium truncate">{fileName}</p>
      <div className="mt-1">
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground mt-0.5 block">
          {status === "pending" ? "Waiting..." : `${progress}%`}
        </span>
      </div>
    </div>
  );
}
