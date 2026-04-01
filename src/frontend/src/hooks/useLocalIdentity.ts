import { Ed25519KeyIdentity } from "@dfinity/identity";
import { createContext, createElement, useContext, useState } from "react";
import type { ReactNode } from "react";

const SEED_KEY = "sr_gw_id_seed_v1";

async function deriveIdentity(
  mobileHash: string,
  passwordHash: string,
): Promise<Ed25519KeyIdentity> {
  const raw = new TextEncoder().encode(
    `${mobileHash}:${passwordHash}:sr-gateway-v1`,
  );
  const seedBuffer = await crypto.subtle.digest("SHA-256", raw);
  const seedHex = Array.from(new Uint8Array(seedBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  localStorage.setItem(SEED_KEY, seedHex);
  return Ed25519KeyIdentity.generate(new Uint8Array(seedBuffer));
}

function loadStoredIdentity(): Ed25519KeyIdentity | null {
  const hex = localStorage.getItem(SEED_KEY);
  if (!hex || hex.length !== 64) return null;
  try {
    const bytes = new Uint8Array(
      (hex.match(/.{2}/g) ?? []).map((h) => Number.parseInt(h, 16)),
    );
    return Ed25519KeyIdentity.generate(bytes);
  } catch {
    return null;
  }
}

export type LocalIdentityContext = {
  identity: Ed25519KeyIdentity | null;
  isInitializing: boolean;
  loginWithHashes: (
    mobileHash: string,
    passwordHash: string,
  ) => Promise<Ed25519KeyIdentity>;
  clear: () => void;
};

const Ctx = createContext<LocalIdentityContext | undefined>(undefined);

export function useLocalIdentity(): LocalIdentityContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("LocalIdentityProvider not found");
  return ctx;
}

export function LocalIdentityProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<Ed25519KeyIdentity | null>(() =>
    loadStoredIdentity(),
  );

  const loginWithHashes = async (
    mobileHash: string,
    passwordHash: string,
  ): Promise<Ed25519KeyIdentity> => {
    const id = await deriveIdentity(mobileHash, passwordHash);
    setIdentity(id);
    return id;
  };

  const clear = () => {
    localStorage.removeItem(SEED_KEY);
    setIdentity(null);
  };

  const value: LocalIdentityContext = {
    identity,
    isInitializing: false,
    loginWithHashes,
    clear,
  };

  return createElement(Ctx.Provider, { value }, children);
}
