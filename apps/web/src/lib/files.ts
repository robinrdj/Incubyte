/**
 * Reads a file as text. Uses FileReader rather than File.text(), so it works in every browser the
 * app targets and in the test environment, which does not implement File.text().
 */
export function readFileText(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("The file could not be read."));
    };
    reader.readAsText(file);
  });
}
