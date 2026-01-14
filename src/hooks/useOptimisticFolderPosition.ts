import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useOptimisticUpdateFolderPosition(spaceId: string) {
  return useMutation(api.folders.updateFolderPosition).withOptimisticUpdate(
    (localStore, args) => {
      const { folderId, positionX, positionY } = args;

      // Get the current space from the query cache
      const currentSpace = localStore.getQuery(api.spaces.getSpace, {
        spaceId,
      });

      if (currentSpace === undefined || currentSpace === null) {
        return; // Query hasn't loaded yet
      }

      // Update the folder position in the local cache
      const updatedFolders = currentSpace.folders.map((folder) => {
        if (folder._id === folderId) {
          return {
            ...folder,
            positionX,
            positionY,
          };
        }
        return folder;
      });

      // Set the updated space back to the cache
      localStore.setQuery(api.spaces.getSpace, { spaceId }, {
        ...currentSpace,
        folders: updatedFolders,
      });
    }
  );
}
