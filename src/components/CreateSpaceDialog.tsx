import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { saveSpace, canCreateSpace, getSpaceCount } from "@/lib/spaces";
import { useSession } from "@/lib/auth-client";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const ANON_EXPIRATION_OPTIONS = [
  { label: "1 hour", value: HOUR },
  { label: "2 hours", value: 2 * HOUR },
  { label: "3 hours", value: 3 * HOUR },
];

const AUTH_EXPIRATION_OPTIONS = [
  { label: "1 hour", value: HOUR },
  { label: "6 hours", value: 6 * HOUR },
  { label: "24 hours", value: DAY },
  { label: "3 days", value: 3 * DAY },
  { label: "7 days", value: 7 * DAY },
  { label: "Never (infinite)", value: 0 },
];

interface CreateSpaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSpaceDialog({
  open,
  onOpenChange,
}: CreateSpaceDialogProps) {
  const [name, setName] = useState("");
  const [allowUploads, setAllowUploads] = useState(true);
  const [requireAuthForUpload, setRequireAuthForUpload] = useState(false);
  const [expiresIn, setExpiresIn] = useState<number>(DAY);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const createSpace = useMutation(api.spaces.createSpace);
  const { data: session } = useSession();
  const spaceCountData = useQuery(api.spaces.getUserSpaceCount);

  const isAuthenticated = !!session?.user;

  // Get appropriate limits
  const localSpaceCount = getSpaceCount();
  const serverSpaceCount = spaceCountData?.count ?? 0;
  const maxSpaces = isAuthenticated ? 5 : 3;
  const currentCount = isAuthenticated ? serverSpaceCount : localSpaceCount;
  const canCreate = currentCount < maxSpaces;
  const hasInfinite = spaceCountData?.hasInfinite ?? false;

  // Get expiration options based on auth status
  const expirationOptions = isAuthenticated
    ? AUTH_EXPIRATION_OPTIONS
    : ANON_EXPIRATION_OPTIONS;

  // Filter out infinite option if user already has one
  const filteredExpirationOptions = expirationOptions.filter(
    (opt) => opt.value !== 0 || !hasInfinite,
  );

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setError(null);
      setName("");
      setAllowUploads(true);
      setRequireAuthForUpload(false);
      // Set default expiration based on auth status
      setExpiresIn(isAuthenticated ? DAY : HOUR);
    }
  }, [open, isAuthenticated]);

  const handleCreate = async () => {
    if (!name.trim()) return;

    // Check limit for anonymous users (localStorage)
    if (!isAuthenticated && !canCreateSpace()) {
      setError("You've reached the limit of 3 spaces. Sign in to create more!");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const result = await createSpace({
        name: name.trim(),
        allowUploads,
        requireAuthForUpload: allowUploads ? requireAuthForUpload : false,
        expiresIn: expiresIn === 0 ? undefined : expiresIn, // undefined = infinite
      });

      // Save to localStorage only for anonymous users
      if (!result.isAuthenticated) {
        const actualExpiresIn = expiresIn === 0 ? 3 * HOUR : expiresIn; // Fallback for anon
        saveSpace({
          spaceId: result.spaceId,
          name: name.trim(),
          createdAt: Date.now(),
          expiresAt: Date.now() + actualExpiresIn,
        });
      }

      onOpenChange(false);
      navigate(`/s/${result.spaceId}`);
    } catch (err) {
      console.error("Failed to create space:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create space. Please try again.",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && name.trim()) {
      handleCreate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a Space</DialogTitle>
          <DialogDescription>
            Create a space to share files with others
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            {currentCount}/{maxSpaces} spaces used
            {!isAuthenticated && (
              <span className="block text-xs mt-1">
                Sign in for up to 5 spaces with longer expiration
              </span>
            )}
            {isAuthenticated && hasInfinite && (
              <span className="block text-xs mt-1">
                You already have 1 infinite space
              </span>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="space-name">Name</Label>
            <Input
              id="space-name"
              placeholder="My shared files"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Expires after</Label>
            <Select
              value={expiresIn.toString()}
              onValueChange={(v) => setExpiresIn(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filteredExpirationOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value.toString()}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allow-uploads">Allow uploads</Label>
              <p className="text-sm text-muted-foreground">
                Let visitors upload files
              </p>
            </div>
            <Switch
              id="allow-uploads"
              checked={allowUploads}
              onCheckedChange={setAllowUploads}
            />
          </div>

          {allowUploads && (
            <div className="flex items-center justify-between pl-4 border-l-2 border-muted">
              <div className="space-y-0.5">
                <Label htmlFor="require-auth">Require login to upload</Label>
                <p className="text-sm text-muted-foreground">
                  Only signed-in users can upload
                </p>
              </div>
              <Switch
                id="require-auth"
                checked={requireAuthForUpload}
                onCheckedChange={setRequireAuthForUpload}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || creating || !canCreate}
          >
            {creating ? "Creating..." : "Create Space"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
