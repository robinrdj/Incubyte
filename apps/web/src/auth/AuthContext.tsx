import type { HrUserDto, SessionDto } from "@salary/shared";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { ApiClient, apiBaseUrl } from "../api/client.js";

const STORAGE_KEY = "salary.session";

interface StoredSession {
  token: string;
  user: HrUserDto;
}

/**
 * The session lives in sessionStorage: a reload keeps the user signed in, and closing the tab signs
 * them out. Storage can be blocked in private windows, so every access is guarded.
 */
function readSession(): StoredSession | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw === null ? null : (JSON.parse(raw) as Partial<StoredSession>);
    return parsed?.token && parsed.user ? (parsed as StoredSession) : null;
  } catch {
    return null;
  }
}

function writeSession(session: StoredSession | null): void {
  try {
    if (session === null) {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } else {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
  } catch {
    // Without storage the session lasts until the page reloads.
  }
}

export interface AuthContextValue {
  isSignedIn: boolean;
  user: HrUserDto | null;
  /** Throws ApiError when the email or password is wrong. */
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  api: ApiClient;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): ReactElement {
  const [session, setSession] = useState<StoredSession | null>(readSession);
  const tokenRef = useRef<string | null>(session?.token ?? null);
  tokenRef.current = session?.token ?? null;

  const clearSession = useCallback((): void => {
    writeSession(null);
    tokenRef.current = null;
    setSession(null);
  }, []);

  const api = useMemo(
    () =>
      new ApiClient({
        token: () => tokenRef.current,
        baseUrl: apiBaseUrl(),
        onUnauthorized: clearSession,
      }),
    [clearSession],
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<void> => {
      const created: SessionDto = await api.signIn({ email: email.trim().toLowerCase(), password });
      const next = { token: created.token, user: created.user };
      writeSession(next);
      tokenRef.current = next.token;
      setSession(next);
    },
    [api],
  );

  const signOut = useCallback((): void => {
    api.signOut().catch(() => undefined);
    clearSession();
  }, [api, clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ isSignedIn: session !== null, user: session?.user ?? null, signIn, signOut, api }),
    [session, signIn, signOut, api],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}
