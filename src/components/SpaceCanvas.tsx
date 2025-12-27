import { useCallback, useState, useRef } from "react";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
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
import { FileNode, FileNodePreview } from "./FileNode";
import { FilePreviewModal } from "./FilePreviewModal";
import { Upload, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FileData {
  _id: Id<"files">;
  name: string;
  size: number;
  mimeType: string;
  positionX: number;
  positionY: number;
  url: string | null;
}

interface SpaceCanvasProps {
  files: FileData[];
  isOwner: boolean;
  allowUploads: boolean;
  onUpload: (file: File, x: number, y: number) => Promise<void>;
}

export function SpaceCanvas({
  files,
  isOwner,
  allowUploads,
  onUpload,
}: SpaceCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeFile, setActiveFile] = useState<FileData | null>(null);

  const updatePosition = useMutation(api.spaces.updateFilePosition);
  const deleteFile = useMutation(api.files.deleteFile);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 3 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 150, tolerance: 5 },
  });
  const sensors = useSensors(mouseSensor, touchSensor);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const fileId = event.active.id as Id<"files">;
      const file = files.find((f) => f._id === fileId);
      if (file) {
        setActiveFile(file);
      }
    },
    [files],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, delta } = event;
      const fileId = active.id as Id<"files">;
      const file = files.find((f) => f._id === fileId);

      setActiveFile(null);

      if (file && delta && canvasRef.current) {
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const isMobile = window.innerWidth < 640;
        const cardWidth = isMobile ? 112 : 144;
        const cardHeight = isMobile ? 110 : 140;

        // Clamp position within canvas bounds
        const newX = Math.min(
          Math.max(0, file.positionX + delta.x),
          canvasRect.width - cardWidth,
        );
        const newY = Math.min(
          Math.max(0, file.positionY + delta.y),
          canvasRect.height - cardHeight,
        );

        await updatePosition({
          fileId,
          positionX: Math.round(newX),
          positionY: Math.round(newY),
        });
      }
    },
    [files, updatePosition],
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

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setUploading(true);
      try {
        for (let i = 0; i < droppedFiles.length; i++) {
          const file = droppedFiles[i];
          await onUpload(file, x + i * 30, y + i * 30);
        }
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
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          await onUpload(file, 100 + i * 30, 100 + i * 30);
        }
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [onUpload],
  );

  const handleDragOver = useCallback(
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

  const handleDelete = useCallback(
    async (fileId: Id<"files">) => {
      if (confirm("Delete this file?")) {
        await deleteFile({ fileId });
      }
    },
    [deleteFile],
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

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          ref={canvasRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "relative min-h-[400px] sm:min-h-[500px] w-full rounded-lg border-2 border-dashed bg-muted/30 transition-colors overflow-hidden",
            isDraggingOver && canUpload && "border-primary bg-primary/5",
            !canUpload && "border-muted",
          )}
        >
          {files.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <Upload className="mb-2 h-12 w-12" />
              <p className="text-lg font-medium">
                {canUpload ? "Drop files here" : "No files yet"}
              </p>
              {canUpload && (
                <>
                  <p className="text-sm">or drag and drop to upload</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {uploading ? "Uploading..." : "Select Files"}
                  </Button>
                </>
              )}
            </div>
          )}

          {files.length > 0 && canUpload && (
            <Button
              variant="outline"
              size="sm"
              className="absolute bottom-4 right-4 z-10"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Plus className="mr-2 h-4 w-4" />
              {uploading ? "Uploading..." : "Add Files"}
            </Button>
          )}

          {files.map((file) => (
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
              onDelete={() => handleDelete(file._id)}
              onPreview={() => setPreviewFile(file)}
            />
          ))}
        </div>

        <DragOverlay
          dropAnimation={{
            duration: 200,
            easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
          }}
        >
          {activeFile ? (
            <FileNodePreview
              name={activeFile.name}
              size={activeFile.size}
              mimeType={activeFile.mimeType}
              url={activeFile.url}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </>
  );
}
