import "@fontsource-variable/geist";
import "@fontsource-variable/sora";
import "@mantine/core/styles.css";
import "./theme/global.css";
import { MantineProvider } from "@mantine/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { App } from "./App.js";
import { AuthProvider } from "./auth/AuthContext.js";
import { cssVariablesResolver, theme } from "./theme/theme.js";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("index.html is missing the #root element");
}

createRoot(rootElement).render(
  <StrictMode>
    {/* "auto" follows the system setting until the user picks light or dark; the choice is remembered. */}
    <MantineProvider
      theme={theme}
      cssVariablesResolver={cssVariablesResolver}
      defaultColorScheme="auto"
    >
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </MantineProvider>
  </StrictMode>,
);
