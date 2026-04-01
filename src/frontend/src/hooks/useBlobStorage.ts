import { HttpAgent } from "@icp-sdk/core/agent";
import { useCallback, useEffect, useState } from "react";
import { loadConfig } from "../config";
import { StorageClient } from "../utils/StorageClient";
import { useLocalIdentity } from "./useLocalIdentity";

const MOTOKO_SENTINEL = "!caf!";

interface BlobConfig {
  storage_gateway_url: string;
  backend_canister_id: string;
  project_id: string;
  backend_host?: string;
  bucket_name: string;
}

export function useBlobStorage() {
  const { identity } = useLocalIdentity();
  const [blobConfig, setBlobConfig] = useState<BlobConfig | null>(null);

  useEffect(() => {
    loadConfig()
      .then(setBlobConfig)
      .catch(() => {});
  }, []);

  const uploadBlob = useCallback(
    async (file: File): Promise<string> => {
      const config = await loadConfig();
      const agent = new HttpAgent({
        identity: identity ?? undefined,
        host: config.backend_host,
      });
      if (config.backend_host?.includes("localhost")) {
        await agent.fetchRootKey().catch(() => {});
      }
      const storageClient = new StorageClient(
        config.bucket_name,
        config.storage_gateway_url,
        config.backend_canister_id,
        config.project_id,
        agent,
      );
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { hash } = await storageClient.putFile(bytes);
      return MOTOKO_SENTINEL + hash;
    },
    [identity],
  );

  const getBlobUrl = useCallback(
    (blobId: string): string => {
      if (!blobId) return "";
      const hash = blobId.startsWith(MOTOKO_SENTINEL)
        ? blobId.slice(MOTOKO_SENTINEL.length)
        : blobId;
      if (!hash) return "";
      const gatewayUrl =
        blobConfig?.storage_gateway_url ?? "https://blob.caffeine.ai";
      const ownerId = blobConfig?.backend_canister_id ?? "";
      const projectId = blobConfig?.project_id ?? "";
      return `${gatewayUrl}/v1/blob/?blob_hash=${encodeURIComponent(hash)}&owner_id=${encodeURIComponent(ownerId)}&project_id=${encodeURIComponent(projectId)}`;
    },
    [blobConfig],
  );

  return { uploadBlob, getBlobUrl };
}
