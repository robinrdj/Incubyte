import {
  Badge,
  Button,
  Card,
  createTheme,
  Paper,
  Table,
  type CSSVariablesResolver,
  type MantineColorsTuple,
} from "@mantine/core";

const BODY_FONT =
  "'Geist Variable', Geist, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const HEADING_FONT = "'Sora Variable', Sora, " + BODY_FONT;

const brand: MantineColorsTuple = [
  "#eef0ff",
  "#dfe2ff",
  "#bdc2fb",
  "#989ff6",
  "#7a80f2",
  "#666cf0",
  "#5b61ef",
  "#4b50d5",
  "#4247bf",
  "#363ca9",
];

/** Blue-tinted dark greys. */
const dark: MantineColorsTuple = [
  "#d5d7e0",
  "#acaebf",
  "#8c8fa3",
  "#666980",
  "#4d4f66",
  "#34354a",
  "#2b2c3d",
  "#1d1e30",
  "#141526",
  "#0c0d21",
];

export const theme = createTheme({
  colors: { brand, dark },
  primaryColor: "brand",
  primaryShade: { light: 6, dark: 5 },
  defaultRadius: "md",
  radius: { xs: "2px", sm: "4px", md: "7px", lg: "13px", xl: "26px" },
  fontFamily: BODY_FONT,
  headings: {
    fontFamily: HEADING_FONT,
    fontWeight: "700",
    sizes: {
      h2: { fontSize: "1.75rem", lineHeight: "1.2" },
      h4: { fontSize: "1.05rem", lineHeight: "1.35" },
    },
  },
  shadows: {
    xs: "0 1px 2px rgb(16 24 40 / 0.05)",
    sm: "0 1px 3px rgb(16 24 40 / 0.08), 0 1px 2px rgb(16 24 40 / 0.04)",
    md: "0 4px 8px -2px rgb(16 24 40 / 0.08), 0 2px 4px -2px rgb(16 24 40 / 0.04)",
    lg: "0 12px 16px -4px rgb(16 24 40 / 0.08), 0 4px 6px -2px rgb(16 24 40 / 0.03)",
  },
  cursorType: "pointer",
  components: {
    Card: Card.extend({
      defaultProps: { radius: "lg", withBorder: true, shadow: "xs", padding: "lg" },
    }),
    Paper: Paper.extend({ defaultProps: { radius: "lg" } }),
    Button: Button.extend({
      defaultProps: { radius: "md" },
      styles: { root: { fontWeight: 600 } },
    }),
    Badge: Badge.extend({
      defaultProps: { variant: "light", radius: "sm" },
      styles: { root: { textTransform: "none", fontWeight: 600, letterSpacing: 0 } },
    }),
    Table: Table.extend({
      defaultProps: { verticalSpacing: "sm", highlightOnHover: true },
      styles: {
        thead: { background: "var(--app-table-head-bg)" },
        th: {
          fontSize: "var(--mantine-font-size-xs)",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--mantine-color-dimmed)",
          whiteSpace: "nowrap",
        },
      },
    }),
  },
});

export const cssVariablesResolver: CSSVariablesResolver = (current) => ({
  variables: {},
  light: {
    "--app-page-bg": "#f6f7fb",
    "--app-sidebar-bg": "#fbfbfe",
    "--app-table-head-bg": current.colors.gray[0],
    "--band-below": "#2a78d6",
    "--band-within": "#8a8983",
    "--band-above": "#e05650",
    "--mantine-color-default-border": current.colors.gray[2],
  },
  dark: {
    "--app-page-bg": current.colors.dark[8],
    "--app-sidebar-bg": current.colors.dark[7],
    "--app-table-head-bg": current.colors.dark[6],
    "--band-below": "#3987e5",
    "--band-within": "#8f8e87",
    "--band-above": "#e05650",
  },
});
