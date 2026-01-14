import type { Id } from "../../convex/_generated/dataModel";

export interface UploadProgress {
  id: string;
  fileName: string;
  progress: number; // 0-100
  status: "pending" | "uploading" | "uploaded" | "error";
  error?: string;
  // Position tracking for canvas display
  positionX?: number;
  positionY?: number;
  folderId?: Id<"folders">;
}
