import type { MouseEvent } from "react";
import { useNavigate } from "react-router";

export interface RowLinkProps {
  onClick: (event: MouseEvent<HTMLElement>) => void;
  style: { cursor: "pointer" };
  "data-row-link": string;
}

/**
 * Makes a whole row clickable. Keep one real link in the row for keyboard users. Inner controls,
 * Ctrl/Cmd-click (new tab), and text selection behave as usual.
 */
export function useRowLink(): (to: string) => RowLinkProps {
  const navigate = useNavigate();

  return (to: string) => ({
    onClick: (event) => {
      const target = event.target as HTMLElement;
      if (target.closest("a, button, input, textarea, select, [role='button']") !== null) return;
      if ((window.getSelection()?.toString() ?? "") !== "") return;
      if (event.metaKey || event.ctrlKey) {
        window.open(to, "_blank", "noopener");
        return;
      }
      void navigate(to);
    },
    style: { cursor: "pointer" },
    "data-row-link": to,
  });
}
