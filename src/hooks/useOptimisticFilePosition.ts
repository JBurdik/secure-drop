import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function useOptimisticUpdateFilePosition(spaceId: Id<"spaces">) {
  return useMutation(api.spaces.updateFilePosition).withOptimisticUpdate(
    (localStore, args) => {
      const { fileId, positionX, positionY } = args;

      // Get the current files from the query cache
      const currentFiles = localStore.getQuery(api.spaces.getSpaceFiles, {
        spaceId,
      });

      if (currentFiles === undefined) {
        return; // Query hasn't loaded yet
      }

      // Update the file position in the local cache
      const updatedFiles = currentFiles.map((file) => {
        if (file._id === fileId) {
          return {
            ...file,
            positionX,
            positionY,
          };
        }
        return file;
      });

      // Set the updated files back to the cache
      localStore.setQuery(api.spaces.getSpaceFiles, { spaceId }, updatedFiles);
    }
  );
}
