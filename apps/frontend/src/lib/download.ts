/** Makes Excel read UTF-8; the import ignores it. */
const UTF8_BOM = "\uFEFF";

function downloadText(filename: string, text: string, mimeType = "text/csv;charset=utf-8"): void {
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

export function downloadCsv(filename: string, csv: string): void {
  downloadText(filename, UTF8_BOM + csv);
}
