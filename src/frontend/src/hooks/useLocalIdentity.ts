import type { Identity } from "@icp-sdk/core/agent";
import { Ed25519KeyIdentity } from "@icp-sdk/core/identity";
import {
  type ReactNode,
  createContext,
  createElement,
  useCallback,
  useContext,
  useState,
} from "react";

type LocalIdentityContextType = {
  identity: Identity | undefined;
  loginWithHashes: (mobileHash: string, passwordHash: string) => Promise<void>;
  clear: () => void;
};

const LocalIdentityReactContext = createContext<
  LocalIdentityContextType | undefined
>(undefined);

/**
 * LocalIdentityProvider — replaces InternetIdentityProvider.
 * Creates a deterministic Ed25519 identity from mobile+password hashes
 * so the same user always gets the same ICP principal (data persists).
 */
export function LocalIdentityProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [identity, setIdentity] = useState<Identity | undefined>(undefined);

  const loginWithHashes = useCallback(
    async (mobileHash: string, passwordHash: string) => {
      const combined = `${mobileHash}|${passwordHash}`;
      const encoded = new TextEncoder().encode(combined);
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
      const seed = new Uint8Array(hashBuffer);
      const id = Ed25519KeyIdentity.generate(seed);
      setIdentity(id);
    },
    [],
  );

  const clear = useCallback(() => {
    setIdentity(undefined);
  }, []);

  return createElement(LocalIdentityReactContext.Provider, {
    value: { identity, loginWithHashes, clear },
    children,
  });
}

/**
 * Hook to access the local identity context.
 */
export function useLocalIdentity(): LocalIdentityContextType {
  const ctx = useContext(LocalIdentityReactContext);
  if (!ctx) {
    throw new Error(
      "useLocalIdentity must be used inside LocalIdentityProvider",
    );
  }
  return ctx;
}
