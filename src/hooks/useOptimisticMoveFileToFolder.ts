import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function useOptimisticMoveFileToFolder(spaceId: Id<"spaces">) {
  return useMutation(api.folders.moveFileToFolder).withOptimisticUpdate(
    (localStore, args) => {
      const { fileId, folderId } = args;

      // Get the current files from the query cache
      const currentFiles = localStore.getQuery(api.spaces.getSpaceFiles, {
        spaceId,
      });

      if (currentFiles === undefined) {
        return; // Query hasn't loaded yet
      }

      // Update the file's folderId in the local cache
      const updatedFiles = currentFiles.map((file) => {
        if (file._id === fileId) {
          return {
            ...file,
            folderId: folderId ?? undefined,
          };
        }
        return file;
      });

      // Set the updated files back to the cache
      localStore.setQuery(api.spaces.getSpaceFiles, { spaceId }, updatedFiles);
    }
  );
}
