import type { MouseEvent } from "react";
import { useNavigate } from "react-router";

export interface RowLinkProps {
  onClick: (event: MouseEvent<HTMLElement>) => void;
  style: { cursor: "pointer" };
  "data-row-link": string;
}

/**
 * Makes a whole table row open a page when clicked. Each row should still contain one real link
 * (usually the person's name), so keyboard and screen-reader users reach the same page; the row
 * click is a larger target for the mouse.
 *
 * Clicks on links, buttons, and inputs inside the row are left to them. Ctrl- or Cmd-click opens a
 * new tab, as with a link, and a click that ends a text selection does not navigate.
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
