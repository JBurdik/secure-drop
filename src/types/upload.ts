export interface UploadProgress {
  id: string;
  fileName: string;
  progress: number; // 0-100
  status: "pending" | "uploading" | "uploaded" | "error";
  error?: string;
}
