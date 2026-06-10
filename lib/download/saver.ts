/**
 * Persist a generated CBZ Blob to the user's disk. Prefers the File System
 * Access API (a real "Save As" dialog) when available, falling back to an
 * anchor download everywhere else (Firefox/Safari). Either way the bytes are
 * produced entirely in the browser — the server never stores anything.
 */
export async function saveBlob(blob: Blob, fileName: string): Promise<void> {
  const picker = (
    window as unknown as {
      showSaveFilePicker?: (opts: unknown) => Promise<FileSystemFileHandle>;
    }
  ).showSaveFilePicker;

  if (typeof picker === "function") {
    try {
      const handle = await picker({
        suggestedName: fileName,
        types: [
          {
            description: "Comic Book Archive",
            accept: { "application/vnd.comicbook+zip": [".cbz"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      // User cancelled the picker — abort silently rather than force-download.
      if (err instanceof DOMException && err.name === "AbortError") return;
      // Otherwise fall through to the anchor fallback.
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after a tick so the download has a chance to start.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
