import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Copy,
  Check,
  Settings,
  QrCode,
  Trash2,
  Clock,
  Upload,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface SpaceHeaderProps {
  spaceId: Id<"spaces">;
  shareId: string;
  name: string;
  expiresAt: number;
  allowUploads: boolean;
  isOwner: boolean;
  onDelete?: () => void;
}

function formatTimeRemaining(expiresAt: number): string {
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) return "Expired";

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function SpaceHeader({
  spaceId,
  shareId,
  name,
  expiresAt,
  allowUploads,
  isOwner,
  onDelete,
}: SpaceHeaderProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editAllowUploads, setEditAllowUploads] = useState(allowUploads);

  const updateSpace = useMutation(api.spaces.updateSpace);

  const shareUrl = `${window.location.origin}/s/${shareId}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveSettings = async () => {
    await updateSpace({
      spaceId,
      name: editName,
      allowUploads: editAllowUploads,
    });
    setShowSettings(false);
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 rounded-lg border bg-card p-3 sm:p-4">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg sm:text-xl font-semibold">{name}</h1>
          <div className="mt-1 flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
              {formatTimeRemaining(expiresAt)}
            </span>
            {allowUploads && (
              <span className="flex items-center gap-1">
                <Upload className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
                <span className="hidden sm:inline">Uploads allowed</span>
                <span className="sm:hidden">Uploads</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="flex-1 sm:flex-none"
          >
            {copied ? (
              <Check className="sm:mr-2 h-4 w-4" />
            ) : (
              <Copy className="sm:mr-2 h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {copied ? "Copied!" : "Copy Link"}
            </span>
          </Button>

          <Button variant="outline" size="icon" onClick={() => setShowQR(true)}>
            <QrCode className="h-4 w-4" />
          </Button>

          {isOwner && (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={onDelete}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Share QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="rounded-lg bg-white p-4">
              <QRCodeSVG value={shareUrl} size={200} />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Scan to open this space
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Space Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="uploads">Allow uploads</Label>
                <p className="text-sm text-muted-foreground">
                  Let visitors upload files to this space
                </p>
              </div>
              <Switch
                id="uploads"
                checked={editAllowUploads}
                onCheckedChange={setEditAllowUploads}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSettings}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
