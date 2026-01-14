import JSZip from "jszip";

export interface DownloadableFile {
  name: string;
  url: string;
}

export async function downloadAsZip(
  files: DownloadableFile[],
  zipName: string = "files.zip"
): Promise<void> {
  const zip = new JSZip();

  // Track file names to handle duplicates
  const nameCount = new Map<string, number>();

  for (const file of files) {
    try {
      const response = await fetch(file.url);
      if (!response.ok) {
        console.error(`Failed to fetch ${file.name}: ${response.statusText}`);
        continue;
      }
      const blob = await response.blob();

      // Handle duplicate file names
      let fileName = file.name;
      const count = nameCount.get(fileName) || 0;
      if (count > 0) {
        const ext = fileName.lastIndexOf(".");
        if (ext > 0) {
          fileName = `${fileName.slice(0, ext)} (${count})${fileName.slice(ext)}`;
        } else {
          fileName = `${fileName} (${count})`;
        }
      }
      nameCount.set(file.name, count + 1);

      zip.file(fileName, blob);
    } catch (error) {
      console.error(`Error fetching ${file.name}:`, error);
    }
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = zipName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
