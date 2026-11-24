/** Byte-order mark so spreadsheet software reads accented names correctly. The API ignores it on import. */
const UTF8_BOM = "\uFEFF";

/**
 * Saves text as a file in the browser. The object URL is revoked after the click, so no memory
 * leaks across downloads.
 */
export function downloadText(
  filename: string,
  text: string,
  mimeType = "text/csv;charset=utf-8",
): void {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

/** Saves CSV text with a UTF-8 byte-order mark, so Excel opens it with the right encoding. */
export function downloadCsv(filename: string, csv: string): void {
  downloadText(filename, UTF8_BOM + csv);
}
