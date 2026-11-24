import { Navigate, Route, Routes } from "react-router";
import { useAuth } from "./auth/AuthContext.js";
import { AppLayout } from "./layout/AppLayout.js";
import { LoginPage } from "./pages/LoginPage.js";
import { NotFoundPage } from "./pages/NotFoundPage.js";
import { SettingsPage } from "./pages/SettingsPage.js";
import { AnalyticsPage } from "./pages/AnalyticsPage.js";
import { DataExchangePage } from "./pages/DataExchangePage.js";
import { DirectoryPage } from "./pages/DirectoryPage.js";
import { EmployeePage } from "./pages/EmployeePage.js";
import { NewEmployeePage } from "./pages/NewEmployeePage.js";

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
        <Route path="employees" element={<DirectoryPage />} />
        <Route path="employees/new" element={<NewEmployeePage />} />
        <Route path="employees/:id" element={<EmployeePage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="data-exchange" element={<DataExchangePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
