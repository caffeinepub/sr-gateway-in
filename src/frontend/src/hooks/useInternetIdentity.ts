/**
 * useInternetIdentity — LOCAL IDENTITY SHIM
 *
 * Internet Identity has been removed. This file provides the same
 * exported interface so that useActor.ts keeps working unchanged.
 * The actual identity state lives in LocalIdentityProvider.
 */
import { type PropsWithChildren, type ReactNode, createElement } from "react";
import { LocalIdentityProvider, useLocalIdentity } from "./useLocalIdentity";

export type Status =
  | "initializing"
  | "idle"
  | "logging-in"
  | "success"
  | "loginError";

export type InternetIdentityContext = {
  identity?: ReturnType<typeof useLocalIdentity>["identity"];
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

/**
 * InternetIdentityProvider — now just wraps LocalIdentityProvider
 * so main.tsx does not need to change.
 */
export function InternetIdentityProvider({
  children,
}: PropsWithChildren<{ children: ReactNode }>) {
  return createElement(LocalIdentityProvider, { children });
}

/**
 * useInternetIdentity — delegates to useLocalIdentity.
 * Provides the same shape so useActor.ts works without modification.
 */
export function useInternetIdentity(): InternetIdentityContext {
  const { identity, clear } = useLocalIdentity();

  return {
    identity,
    login: () => {
      // No-op: login is handled via loginWithHashes in App.tsx
    },
    clear,
    loginStatus: identity ? "success" : "idle",
    isInitializing: false,
    isLoginIdle: !identity,
    isLoggingIn: false,
    isLoginSuccess: !!identity,
    isLoginError: false,
    loginError: undefined,
  };
}
