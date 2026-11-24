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
import { ApiClient, toBase64 } from "../api/client.js";

const STORAGE_KEY = "salary.session";

/**
 * Keeps the Basic-auth token for the browser tab only (sessionStorage), so a reload keeps the user
 * signed in and closing the tab signs them out. Storage can be blocked (private windows, strict
 * settings), so every access is guarded and the app still works without it.
 */
function readStoredToken(): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredToken(token: string | null): void {
  try {
    if (token === null) {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } else {
      window.sessionStorage.setItem(STORAGE_KEY, token);
    }
  } catch {
    // Storage unavailable: the session lasts until reload, which is an acceptable fallback.
  }
}

/** The email inside a Basic-auth token, or null if the token cannot be read. */
export function emailFromToken(token: string): string | null {
  try {
    const bytes = Uint8Array.from(atob(token), (char) => char.charCodeAt(0));
    const decoded = new TextDecoder().decode(bytes);
    const separator = decoded.indexOf(":");
    return separator > 0 ? decoded.slice(0, separator) : null;
  } catch {
    return null;
  }
}

export interface AuthContextValue {
  isSignedIn: boolean;
  /** The signed-in HR email, for display. */
  email: string | null;
  /**
   * Verifies the credentials against the API, then starts the session. Throws ApiError if rejected.
   * The email is trimmed and lower-cased, so capitals typed on a phone keyboard still match.
   */
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  /** The API client, bound to the current session. */
  api: ApiClient;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): ReactElement {
  const [token, setToken] = useState<string | null>(readStoredToken);

  // The client reads the token through a ref, so it always sends the current session.
  const tokenRef = useRef<string | null>(token);
  tokenRef.current = token;

  const api = useMemo(() => new ApiClient({ authorization: () => tokenRef.current }), []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<void> => {
      const candidate = toBase64(`${email.trim().toLowerCase()}:${password}`);
      tokenRef.current = candidate;
      try {
        // A cheap authenticated call. It fails with 401 if the credentials are wrong.
        await new ApiClient({ authorization: () => candidate }).listEmployees({ pageSize: 1 });
      } catch (error) {
        tokenRef.current = token;
        throw error;
      }
      writeStoredToken(candidate);
      setToken(candidate);
    },
    [token],
  );

  const signOut = useCallback((): void => {
    writeStoredToken(null);
    tokenRef.current = null;
    setToken(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isSignedIn: token !== null,
      email: token === null ? null : emailFromToken(token),
      signIn,
      signOut,
      api,
    }),
    [token, signIn, signOut, api],
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
