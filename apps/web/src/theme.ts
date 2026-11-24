import {
  Badge,
  Button,
  Card,
  createTheme,
  Paper,
  Table,
  type CSSVariablesResolver,
} from "@mantine/core";

const FONT = "'Inter Variable', Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/**
 * The app's look: Inter, an indigo accent, rounded cards with soft borders, and comfortable tables.
 * Every colour comes from Mantine's palette, so light and dark mode both follow from it.
 */
export const theme = createTheme({
  primaryColor: "indigo",
  primaryShade: { light: 6, dark: 5 },
  defaultRadius: "md",
  fontFamily: FONT,
  headings: { fontFamily: FONT, fontWeight: "650" },
  cursorType: "pointer",
  components: {
    Card: Card.extend({
      defaultProps: { radius: "lg", withBorder: true, shadow: "xs", padding: "lg" },
    }),
    Paper: Paper.extend({ defaultProps: { radius: "lg" } }),
    Button: Button.extend({ defaultProps: { radius: "md" } }),
    Badge: Badge.extend({ defaultProps: { variant: "light", radius: "sm" } }),
    Table: Table.extend({
      defaultProps: { verticalSpacing: "sm", highlightOnHover: true },
      styles: {
        th: {
          fontSize: "var(--mantine-font-size-xs)",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color: "var(--mantine-color-dimmed)",
        },
      },
    }),
  },
});

/** A page background a step away from the card colour, so cards stand out in both modes. */
export const cssVariablesResolver: CSSVariablesResolver = (current) => ({
  variables: {},
  light: { "--app-page-bg": current.colors.gray[0] },
  dark: { "--app-page-bg": current.colors.dark[8] },
});
