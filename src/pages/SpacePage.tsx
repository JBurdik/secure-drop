import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SpaceCanvas } from "@/components/SpaceCanvas";
import { SpaceHeader } from "@/components/SpaceHeader";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCallback, useMemo } from "react";
import { getStoredSpaces, removeSpace } from "@/lib/spaces";

export default function SpacePage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate = useNavigate();

  const space = useQuery(api.spaces.getSpace, { spaceId: spaceId || "" });
  const files = useQuery(
    api.spaces.getSpaceFiles,
    space?._id ? { spaceId: space._id } : "skip",
  );

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const uploadFile = useMutation(api.files.uploadFile);
  const deleteSpace = useMutation(api.spaces.deleteSpace);

  // Check if this is an anonymous space owned by current user (via localStorage)
  const isLocalOwner = useMemo(() => {
    if (!spaceId) return false;
    const storedSpaces = getStoredSpaces();
    return storedSpaces.some((s) => s.spaceId === spaceId);
  }, [spaceId]);

  // User is owner if backend says so OR if they have it in localStorage
  const isOwner = (space?.isOwner ?? false) || isLocalOwner;

  const handleUpload = useCallback(
    async (file: File, x: number, y: number) => {
      if (!space?._id) return;

      const uploadUrl = await generateUploadUrl();

      const response = await fetch(uploadUrl, {
        method: "POST",
        body: file,
      });

      const { storageId } = await response.json();

      await uploadFile({
        storageId,
        name: file.name,
        size: file.size,
        mimeType: file.type || "application/octet-stream",
        spaceId: space._id,
        positionX: x,
        positionY: y,
      });
    },
    [space?._id, generateUploadUrl, uploadFile],
  );

  const handleDeleteSpace = useCallback(async () => {
    if (!space?._id) return;
    if (!confirm("Delete this space and all its files?")) return;

    try {
      await deleteSpace({ spaceId: space._id });
    } catch (error) {
      // If backend delete fails (e.g., not authenticated owner),
      // still remove from localStorage if it's there
      console.error("Failed to delete from backend:", error);
    }

    // Remove from localStorage if present
    if (spaceId) {
      removeSpace(spaceId);
    }

    navigate("/");
  }, [space?._id, spaceId, deleteSpace, navigate]);

  if (space === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (space === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Space not found</h1>
        <p className="text-muted-foreground">
          This space may have expired or doesn't exist.
        </p>
        <Button asChild>
          <Link to="/">Go Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Home
            </Link>
          </Button>
        </div>

        <div className="space-y-4">
          <SpaceHeader
            spaceId={space._id}
            shareId={space.spaceId}
            name={space.name}
            expiresAt={space.expiresAt}
            allowUploads={space.allowUploads}
            isOwner={isOwner}
            onDelete={handleDeleteSpace}
          />

          <SpaceCanvas
            files={files || []}
            isOwner={isOwner}
            allowUploads={space.allowUploads}
            onUpload={handleUpload}
          />
        </div>
      </div>
    </div>
  );
}
