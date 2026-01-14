import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CreateSpaceDialog } from "@/components/CreateSpaceDialog";
import { Plus, FolderOpen, Clock, Sun, Moon, Infinity, Link2, Upload } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { getStoredSpaces, type StoredSpace } from "@/lib/spaces";
import { UserMenu } from "@/components/UserMenu";
import { useSession } from "@/lib/auth-client";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function formatTimeRemaining(expiresAt: number): string {
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) return "Expired";

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }
  return `${hours}h`;
}

function App() {
  const [showCreate, setShowCreate] = useState(false);
  const [localSpaces, setLocalSpaces] = useState<StoredSpace[]>([]);
  const { theme, toggleTheme } = useTheme();
  const { data: session } = useSession();

  // Fetch spaces from database for authenticated users
  const dbSpaces = useQuery(api.spaces.getUserSpaces);

  // Load spaces from localStorage (for anonymous users or as fallback)
  useEffect(() => {
    setLocalSpaces(getStoredSpaces());
  }, [showCreate]); // Refresh when dialog closes

  // Combine spaces: use DB spaces for authenticated users, localStorage for anonymous
  const spaces = useMemo(() => {
    if (session?.user && dbSpaces) {
      // Authenticated: use database spaces
      return dbSpaces.map((s) => ({
        spaceId: s.spaceId,
        name: s.name,
        createdAt: 0, // Not stored in DB
        expiresAt: s.expiresAt,
      }));
    }
    // Anonymous: use localStorage
    return localSpaces;
  }, [session?.user, dbSpaces, localSpaces]);

  const isAuthenticated = !!session?.user;
  const maxSpaces = isAuthenticated ? 5 : 3;

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

      {/* Hero */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-16">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Share files simply
          </h1>
          <p className="mt-4 max-w-lg text-base sm:text-lg text-muted-foreground">
            Create a space, drop your files, share the link. That's it.
          </p>
          <Button
            size="lg"
            className="mt-8"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="mr-2 h-5 w-5" />
            Create a Space
          </Button>
        </div>

        {/* Your Spaces */}
        {spaces.length > 0 && (
          <div className="mt-16">
            <h2 className="mb-4 text-lg font-semibold">Your Spaces</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {spaces.length}/{maxSpaces} spaces used.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {spaces.map((space) => (
                <Link
                  key={space.spaceId}
                  to={`/s/${space.spaceId}`}
                  className="group rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-muted p-2">
                      <FolderOpen className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-medium group-hover:text-accent-foreground">
                        {space.name}
                      </h3>
                      <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        {space.expiresAt === 0 ? (
                          <>
                            <Infinity className="h-3 w-3" />
                            <span>Never expires</span>
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3" />
                            {formatTimeRemaining(space.expiresAt)}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Features */}
        <div className="mt-12 sm:mt-16 grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-3">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <Link2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold">Simple Sharing</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              One link for your entire space. Share with anyone.
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold">Auto-Expiring</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Files automatically deleted after your chosen time.
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold">Receive Files</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Let others upload files to your space.
            </p>
          </div>
        </div>
      </main>

      <CreateSpaceDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  );
}

export default App;
