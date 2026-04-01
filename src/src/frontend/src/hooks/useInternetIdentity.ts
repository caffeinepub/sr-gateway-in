import type { Identity } from "@icp-sdk/core/agent";
import {
  type PropsWithChildren,
  type ReactNode,
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type Status =
  | "initializing"
  | "idle"
  | "logging-in"
  | "success"
  | "loginError";

export type InternetIdentityContext = {
  identity?: Identity;
  login: () => void;
  clear: () => void;
  loginStatus: Status;
  isInitializing: boolean;
  isLoginIdle: boolean;
  isLoggingIn: boolean;
  isLoginSuccess: boolean;
  isLoginError: boolean;
  loginError?: Error;
};

// Simple anonymous identity that satisfies the Identity interface
class LocalAnonymousIdentity {
  getPrincipal() {
    return {
      isAnonymous: () => true,
      toString: () => "2vxsx-fae",
      toText: () => "2vxsx-fae",
      toUint8Array: () => new Uint8Array([4]),
      compareTo: () => "eq" as const,
      _isPrincipal: true as const,
    } as any;
  }
  async sign(_blob: ArrayBuffer): Promise<ArrayBuffer> {
    return new ArrayBuffer(0);
  }
  async transformRequest(request: any) {
    return { ...request, sender: new Uint8Array([4]) };
  }
}

const LocalIdentityContext = createContext<InternetIdentityContext | undefined>(
  undefined,
);

export const useInternetIdentity = (): InternetIdentityContext => {
  const context = useContext(LocalIdentityContext);
  if (!context) {
    throw new Error("InternetIdentityProvider not found");
  }
  return context;
};

export function InternetIdentityProvider({
  children,
}: PropsWithChildren<{ createOptions?: any }>) {
  const [identity, setIdentity] = useState<Identity | undefined>(undefined);
  const [loginStatus, setLoginStatus] = useState<Status>("idle");

  // Call login() to mark user as authenticated (after mobile+password verify)
  const login = useCallback(() => {
    setIdentity(new LocalAnonymousIdentity() as unknown as Identity);
    setLoginStatus("success");
  }, []);

  // Call clear() to log user out
  const clear = useCallback(() => {
    setIdentity(undefined);
    setLoginStatus("idle");
  }, []);

  const value = useMemo<InternetIdentityContext>(
    () => ({
      identity,
      login,
      clear,
      loginStatus,
      isInitializing: false,
      isLoginIdle: loginStatus === "idle",
      isLoggingIn: loginStatus === "logging-in",
      isLoginSuccess: loginStatus === "success",
      isLoginError: loginStatus === "loginError",
      loginError: undefined,
    }),
    [identity, login, clear, loginStatus],
  );

  return createElement(LocalIdentityContext.Provider, { value, children });
}
