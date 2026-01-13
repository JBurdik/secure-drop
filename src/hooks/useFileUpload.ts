import { useState, useCallback, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { UploadProgress } from "../types/upload";

const PROGRESS_THROTTLE_MS = 100;

export function useFileUpload(spaceId: Id<"spaces"> | undefined) {
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map());
  const lastProgressUpdate = useRef<Map<string, number>>(new Map());

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const uploadFile = useMutation(api.files.uploadFile);

  const uploadWithProgress = useCallback(
    async (file: File, x: number, y: number): Promise<void> => {
      if (!spaceId) return;

      const uploadId = crypto.randomUUID();

      // Initialize upload state
      setUploads((prev) => {
        const next = new Map(prev);
        next.set(uploadId, {
          id: uploadId,
          fileName: file.name,
          progress: 0,
          status: "pending",
        });
        return next;
      });

      try {
        // Get upload URL
        const uploadUrl = await generateUploadUrl();

        // Update status to uploading
        setUploads((prev) => {
          const next = new Map(prev);
          const current = next.get(uploadId);
          if (current) {
            next.set(uploadId, { ...current, status: "uploading" });
          }
          return next;
        });

        // Upload with XMLHttpRequest for progress tracking
        const storageId = await new Promise<Id<"_storage">>(
          (resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                const now = Date.now();
                const lastUpdate =
                  lastProgressUpdate.current.get(uploadId) || 0;

                // Throttle progress updates
                if (now - lastUpdate >= PROGRESS_THROTTLE_MS) {
                  lastProgressUpdate.current.set(uploadId, now);
                  const progress = Math.round(
                    (event.loaded / event.total) * 100
                  );

                  setUploads((prev) => {
                    const next = new Map(prev);
                    const current = next.get(uploadId);
                    if (current) {
                      next.set(uploadId, { ...current, progress });
                    }
                    return next;
                  });
                }
              }
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const response = JSON.parse(xhr.responseText);
                  resolve(response.storageId);
                } catch {
                  reject(new Error("Invalid response"));
                }
              } else {
                reject(new Error(`Upload failed: ${xhr.status}`));
              }
            };

            xhr.onerror = () => reject(new Error("Network error"));
            xhr.onabort = () => reject(new Error("Upload aborted"));

            xhr.open("POST", uploadUrl);
            xhr.send(file);
          }
        );

        // Create file record
        await uploadFile({
          storageId,
          name: file.name,
          size: file.size,
          mimeType: file.type || "application/octet-stream",
          spaceId,
          positionX: x,
          positionY: y,
        });

        // Mark as uploaded
        setUploads((prev) => {
          const next = new Map(prev);
          const current = next.get(uploadId);
          if (current) {
            next.set(uploadId, {
              ...current,
              progress: 100,
              status: "uploaded",
            });
          }
          return next;
        });

        // Remove from uploads after a delay
        setTimeout(() => {
          setUploads((prev) => {
            const next = new Map(prev);
            next.delete(uploadId);
            return next;
          });
        }, 2000);
      } catch (error) {
        setUploads((prev) => {
          const next = new Map(prev);
          const current = next.get(uploadId);
          if (current) {
            next.set(uploadId, {
              ...current,
              status: "error",
              error: error instanceof Error ? error.message : "Upload failed",
            });
          }
          return next;
        });
      }
    },
    [spaceId, generateUploadUrl, uploadFile]
  );

  const clearUpload = useCallback((uploadId: string) => {
    setUploads((prev) => {
      const next = new Map(prev);
      next.delete(uploadId);
      return next;
    });
  }, []);

  return {
    uploads,
    uploadWithProgress,
    clearUpload,
  };
}
