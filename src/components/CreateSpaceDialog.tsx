import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
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

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const EXPIRATION_OPTIONS = [
  { label: "1 hour", value: HOUR },
  { label: "6 hours", value: 6 * HOUR },
  { label: "24 hours", value: DAY },
  { label: "3 days", value: 3 * DAY },
  { label: "7 days", value: 7 * DAY },
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
  const [expiresIn, setExpiresIn] = useState<number>(DAY);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const createSpace = useMutation(api.spaces.createSpace);

  // Check if user can create more spaces
  const spaceCount = getSpaceCount();
  const canCreate = canCreateSpace();

  // Reset error when dialog opens
  useEffect(() => {
    if (open) {
      setError(null);
      setName("");
    }
  }, [open]);

  const handleCreate = async () => {
    if (!name.trim()) return;

    // Check limit
    if (!canCreateSpace()) {
      setError("You've reached the limit of 3 spaces.");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const result = await createSpace({
        name: name.trim(),
        allowUploads,
        expiresIn,
      });

      // Save to localStorage
      saveSpace({
        spaceId: result.spaceId,
        name: name.trim(),
        createdAt: Date.now(),
        expiresAt: Date.now() + expiresIn,
      });

      onOpenChange(false);
      navigate(`/s/${result.spaceId}`);
    } catch (err) {
      console.error("Failed to create space:", err);
      setError("Failed to create space. Please try again.");
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
            {spaceCount}/3 spaces used
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
                {EXPIRATION_OPTIONS.map((opt) => (
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
