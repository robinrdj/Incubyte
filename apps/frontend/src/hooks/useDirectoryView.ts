import { useState } from "react";

export type DirectoryView = "table" | "cards";

const VIEW_STORAGE_KEY = "salary.directory-view";

/** Table by default; the choice is remembered in this browser. */
export function useDirectoryView(): [DirectoryView, (view: DirectoryView) => void] {
  const [view, setView] = useState<DirectoryView>(() => {
    try {
      return window.localStorage.getItem(VIEW_STORAGE_KEY) === "cards" ? "cards" : "table";
    } catch {
      return "table";
    }
  });
  const choose = (next: DirectoryView): void => {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // Storage blocked: the choice lasts until reload.
    }
  };
  return [view, choose];
}
