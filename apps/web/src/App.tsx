import { Navigate, Route, Routes } from "react-router";
import { useAuth } from "./auth/AuthContext.js";
import { AppLayout } from "./layout/AppLayout.js";
import { LoginPage } from "./pages/LoginPage.js";
import { NotFoundPage } from "./pages/NotFoundPage.js";
import { SectionPlaceholder } from "./pages/SectionPlaceholder.js";

/** Signed-out visitors see the sign-in page at any address. Signing in keeps the address they opened. */
export function App(): React.JSX.Element {
  const { isSignedIn } = useAuth();
  if (!isSignedIn) {
    return <LoginPage />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/employees" replace />} />
        <Route
          path="employees"
          element={
            <SectionPlaceholder
              title="Employees"
              description="The employee directory is being built."
            />
          }
        />
        <Route
          path="analytics"
          element={
            <SectionPlaceholder
              title="Analytics"
              description="Compensation analytics are being built."
            />
          }
        />
        <Route
          path="data-exchange"
          element={
            <SectionPlaceholder
              title="Import and export"
              description="CSV import and export are being built."
            />
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
