import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SpaceCanvas } from "@/components/SpaceCanvas";
import { SpaceHeader } from "@/components/SpaceHeader";
import { UserMenu } from "@/components/UserMenu";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Sun, Moon } from "lucide-react";
import { useCallback, useMemo } from "react";
import { getStoredSpaces, removeSpace } from "@/lib/spaces";
import { useTheme } from "@/lib/theme";
import { useFileUpload } from "@/hooks/useFileUpload";

export default function SpacePage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const space = useQuery(api.spaces.getSpace, { spaceId: spaceId || "" });
  const files = useQuery(
    api.spaces.getSpaceFiles,
    space?._id ? { spaceId: space._id } : "skip",
  );

  const deleteSpace = useMutation(api.spaces.deleteSpace);
  const { uploads, uploadWithProgress } = useFileUpload(space?._id);

  // Check if this is an anonymous space owned by current user (via localStorage)
  const isLocalOwner = useMemo(() => {
    if (!spaceId) return false;
    const storedSpaces = getStoredSpaces();
    return storedSpaces.some((s) => s.spaceId === spaceId);
  }, [spaceId]);

  // User is owner if backend says so OR if they have it in localStorage
  const isOwner = (space?.isOwner ?? false) || isLocalOwner;

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
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-xl font-bold">
            SecureDrop
          </Link>
          <nav className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9"
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>
            <UserMenu />
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-2 sm:px-4 py-4 sm:py-6">
        <div className="mb-3 sm:mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Link>
          </Button>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <SpaceHeader
            spaceId={space._id}
            shareId={space.spaceId}
            name={space.name}
            expiresAt={space.expiresAt}
            allowUploads={space.allowUploads}
            requireAuthForUpload={space.requireAuthForUpload}
            isOwner={isOwner}
            onDelete={handleDeleteSpace}
          />

          <SpaceCanvas
            spaceId={space._id}
            spaceCode={space.spaceId}
            files={files || []}
            folders={space.folders || []}
            isOwner={isOwner}
            allowUploads={space.allowUploads}
            uploads={uploads}
            onUpload={uploadWithProgress}
          />
        </div>
      </div>
    </div>
  );
}
