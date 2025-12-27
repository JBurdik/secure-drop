import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface FileData {
  _id: string;
  name: string;
  mimeType: string;
  url: string | null;
}

interface FilePreviewModalProps {
  file: FileData | null;
  onClose: () => void;
}

export function FilePreviewModal({ file, onClose }: FilePreviewModalProps) {
  if (!file || !file.url) return null;

  const renderPreview = () => {
    if (file.mimeType.startsWith("image/")) {
      return (
        <img
          src={file.url!}
          alt={file.name}
          className="max-h-[70vh] w-full object-contain"
        />
      );
    }

    if (file.mimeType.startsWith("video/")) {
      return (
        <video controls className="max-h-[70vh] w-full">
          <source src={file.url!} type={file.mimeType} />
          Your browser does not support video playback.
        </video>
      );
    }

    if (file.mimeType.startsWith("audio/")) {
      return (
        <div className="flex h-32 items-center justify-center">
          <audio controls className="w-full max-w-md">
            <source src={file.url!} type={file.mimeType} />
            Your browser does not support audio playback.
          </audio>
        </div>
      );
    }

    if (file.mimeType === "application/pdf") {
      return (
        <iframe
          src={file.url!}
          className="h-[70vh] w-full rounded"
          title={file.name}
        />
      );
    }

    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        Preview not available for this file type
      </div>
    );
  };

  return (
    <Dialog open={!!file} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <span className="truncate">{file.name}</span>
            <Button variant="outline" size="sm" asChild>
              <a href={file.url!} download={file.name}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </a>
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">{renderPreview()}</div>
      </DialogContent>
    </Dialog>
  );
}
