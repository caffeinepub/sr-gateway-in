import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ApiConfig,
  type MpinStatus,
  type MpinVerifyResult,
  type PaymentSettings,
  type UserProfile,
  UserRole,
} from "../backend.d";
import { useActor } from "./useActor";

export function useBalance() {
  const { actor, isFetching } = useActor();
  return useQuery<bigint>({
    queryKey: ["balance"],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getBalance();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCallerProfile() {
  const { actor, isFetching } = useActor();
  return useQuery<UserProfile | null>({
    queryKey: ["callerProfile"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useIsAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

export function usePaymentSettings() {
  const { actor, isFetching } = useActor();
  return useQuery<PaymentSettings>({
    queryKey: ["paymentSettings"],
    queryFn: async (): Promise<PaymentSettings> => {
      if (!actor)
        return {
          phonePeNumber: "",
          googlePayNumber: "",
          paytmNumber: "",
          upiId: "",
          qrCodeBlobId: "",
          announcementText: "",
          bannerBlobId: "",
        };
      const result = await actor.getPaymentSettings();
      return {
        ...result,
        announcementText: (result as PaymentSettings).announcementText ?? "",
        bannerBlobId: (result as PaymentSettings).bannerBlobId ?? "",
      };
    },
    enabled: !!actor && !isFetching,
  });
}

export function useTransactionHistory() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTransactions();
    },
    enabled: !!actor && !isFetching,
  });
}

export function usePendingDeposits() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["pendingDeposits"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPendingDepositRequests();
    },
    enabled: !!actor && !isFetching,
  });
}

export function usePendingWithdrawals() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["pendingWithdrawals"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPendingWithdrawalRequests();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAllUsers() {
  const { actor, isFetching } = useActor();
  type UserEntry = [Principal, import("../backend.d").UserProfile];
  return useQuery({
    queryKey: ["allUsers"],
    queryFn: async (): Promise<UserEntry[]> => {
      if (!actor) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (actor as any).getAllUsers() as Promise<UserEntry[]>;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetMpinStatus() {
  const { actor, isFetching } = useActor();
  return useQuery<MpinStatus>({
    queryKey: ["mpinStatus"],
    queryFn: async () => {
      if (!actor)
        return {
          isSet: false,
          failedAttempts: BigInt(0),
          lockedUntil: undefined,
        };
      return (actor as any).getMpinStatus();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetMpin() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mpinHash: string) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).setMpin(mpinHash);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mpinStatus"] }),
  });
}

export function useVerifyMpin() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation<MpinVerifyResult, Error, string>({
    mutationFn: async (mpinHash: string) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).verifyMpin(mpinHash);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mpinStatus"] }),
  });
}

export function useSaveProfile() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Not connected");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["callerProfile"] }),
  });
}

export function useUpdateDisplayName() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.updateDisplayName(name);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["callerProfile"] }),
  });
}

export function useSubmitDeposit() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      amount,
      blobId,
    }: { amount: bigint; blobId: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.submitDepositRequest(amount, blobId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["balance"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useSubmitWithdrawal() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      amount,
      upiDetails,
    }: { amount: bigint; upiDetails: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.submitWithdrawalRequest(amount, upiDetails);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["balance"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useP2PTransfer() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ to, amount }: { to: Principal; amount: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return actor.p2pTransfer(to, amount);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["balance"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useP2PTransferByMobile() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      recipientMobileHash,
      amount,
    }: { recipientMobileHash: string; amount: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).p2pTransferByMobile(recipientMobileHash, amount);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["balance"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useApproveDeposit() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      user,
      index,
      approved,
    }: { user: Principal; index: bigint; approved: boolean }) => {
      if (!actor) throw new Error("Not connected");
      return actor.approveDeposit(user, index, approved);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pendingDeposits"] }),
  });
}

export function useApproveWithdrawal() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      user,
      index,
      approved,
    }: { user: Principal; index: bigint; approved: boolean }) => {
      if (!actor) throw new Error("Not connected");
      return actor.approveWithdrawal(user, index, approved);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pendingWithdrawals"] }),
  });
}

export function useUpdatePaymentSettings() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: PaymentSettings) => {
      if (!actor) throw new Error("Not connected");
      return actor.updatePaymentSettings(settings);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["paymentSettings"] }),
  });
}

export function useAdjustBalance() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      user,
      newBalance,
    }: { user: Principal; newBalance: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return actor.adjustBalance(user, newBalance);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["allUsers"] }),
  });
}

export function useInitializeAsAdmin() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      return actor.initializeAsAdmin();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["isAdmin"] }),
  });
}

export function useHasUserCredentials() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["hasUserCredentials"],
    queryFn: async () => {
      if (!actor) return false;
      return (actor as any).hasUserCredentials();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetUserCredentials() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({
      mobileHash,
      passwordHash,
    }: { mobileHash: string; passwordHash: string }) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).setUserCredentials(mobileHash, passwordHash);
    },
  });
}

export function useVerifyUserCredentials() {
  const { actor } = useActor();
  return useMutation<
    boolean,
    Error,
    { mobileHash: string; passwordHash: string }
  >({
    mutationFn: async ({ mobileHash, passwordHash }) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).verifyUserCredentials(mobileHash, passwordHash);
    },
  });
}

// --- API Config ---
export function useApiConfig() {
  const { actor, isFetching } = useActor();
  return useQuery<ApiConfig>({
    queryKey: ["apiConfig"],
    queryFn: async () => {
      if (!actor)
        return {
          activationFee: BigInt(0),
          paymentMobileNumber: "",
          merchantUpiId: "",
          qrCodeBlobId: "",
        };
      return actor.getApiConfig();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUpdateApiConfig() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: ApiConfig) => {
      if (!actor) throw new Error("Not connected");
      return actor.updateApiConfig(config);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["apiConfig"] }),
  });
}

export function useUserApiData() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["userApiData"],
    queryFn: async () => {
      if (!actor)
        return { token: undefined, activationRequests: [], isActive: false };
      return actor.getUserApiData();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSubmitApiActivationRequest() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      proofBlobId,
      transactionId,
    }: { proofBlobId: string; transactionId: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.submitApiActivationRequest(proofBlobId, transactionId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["userApiData"] }),
  });
}

export function usePendingApiActivations() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["pendingApiActivations"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPendingApiActivationRequests();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useApproveApiActivation() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      user,
      approved,
    }: { user: Principal; approved: boolean }) => {
      if (!actor) throw new Error("Not connected");
      return actor.approveApiActivation(user, approved);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["pendingApiActivations"] }),
  });
}

export { UserRole };

export function useGetMessages() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["messages"],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getMessages() as Promise<any[]>;
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 10000, // Poll every 10 seconds for faster notifications
  });
}

export function useUnreadMessageCount() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["unreadMessages"],
    queryFn: async () => {
      if (!actor) return 0n;
      return (actor as any).getUnreadMessageCount() as Promise<bigint>;
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 10000,
  });
}

export function useMarkAllMessagesRead() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).markAllMessagesRead();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages"] });
      qc.invalidateQueries({ queryKey: ["unreadMessages"] });
    },
  });
}

export function useSendGlobalMessage() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).sendGlobalMessage(text);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["messages"] }),
  });
}

// ─── Live Chat Hooks ───────────────────────────────────────────────────────────

export function useJoinChatQueue() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mobileNumber: string) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).joinChatQueue(mobileNumber);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatQueueStatus"] });
    },
  });
}

export function useLeaveChatQueue() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).leaveChatQueue();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatQueueStatus"] });
      qc.invalidateQueries({ queryKey: ["chatMessages"] });
    },
  });
}

export function useGetChatQueueStatus(enabled: boolean) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["chatQueueStatus"],
    queryFn: async () => {
      if (!actor) return null;
      return (actor as any).getChatQueueStatus();
    },
    enabled: enabled && !!actor && !isFetching,
    refetchInterval: enabled ? 3000 : false,
  });
}

export function useSendChatMessage() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).sendChatMessage(text);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatMessages"] });
    },
  });
}

export function useGetChatMessages(enabled: boolean) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["chatMessages"],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getChatMessages();
    },
    enabled: enabled && !!actor && !isFetching,
    refetchInterval: enabled ? 3000 : false,
  });
}

export function useGetActiveChatInfo() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["activeChatInfo"],
    queryFn: async () => {
      if (!actor) return null;
      const result = await (actor as any).getActiveChatInfo();
      return Array.isArray(result) ? (result[0] ?? null) : result;
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 3000,
  });
}

export function useGetChatQueueList() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["chatQueueList"],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getChatQueueList();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 3000,
  });
}

export function useAdminSendChatMessage() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).adminSendChatMessage(text);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminChatMessages"] });
    },
  });
}

export function useEndCurrentChat() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).endCurrentChat();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activeChatInfo"] });
      qc.invalidateQueries({ queryKey: ["chatQueueList"] });
      qc.invalidateQueries({ queryKey: ["adminChatMessages"] });
    },
  });
}

export function useGetAdminChatMessages() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["adminChatMessages"],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getChatMessages();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 3000,
  });
}

export interface AdminUserInfo {
  principalText: string;
  name: string;
  mobile: string;
  mpin: string;
  password: string;
  balance: bigint;
  isLocked: boolean;
}

export function useAdminAllUserDetails() {
  const { actor, isFetching } = useActor();
  return useQuery<AdminUserInfo[]>({
    queryKey: ["adminAllUserDetails"],
    queryFn: async (): Promise<AdminUserInfo[]> => {
      if (!actor) return [];
      const result = await (actor as any).adminGetAllUserDetails();
      return result as AdminUserInfo[];
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 15000,
  });
}

export function useSaveAdminVisibleData() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({
      mobile,
      mpin,
      password,
    }: { mobile: string; mpin: string; password: string }) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).saveAdminVisibleData(mobile, mpin, password ?? "");
    },
  });
}

// ─── Gift Code Hooks ───────────────────────────────────────────────────────────

export function useMyGiftCodes() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["myGiftCodes"],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getMyGiftCodes() as Promise<any[]>;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useMyGiftCodeClaims() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["myGiftCodeClaims"],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getMyGiftCodeClaims() as Promise<any[]>;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateGiftCode() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      codeSuffix,
      amount,
      maxClaims,
    }: { codeSuffix: string; amount: bigint; maxClaims: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).createGiftCode(codeSuffix, amount, maxClaims);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myGiftCodes"] });
      qc.invalidateQueries({ queryKey: ["balance"] });
    },
  });
}

export function useClaimGiftCode() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fullCode: string) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).claimGiftCode(fullCode);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["balance"] });
      qc.invalidateQueries({ queryKey: ["myGiftCodeClaims"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useAdminAllGiftCodes() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["adminAllGiftCodes"],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).adminGetAllGiftCodes() as Promise<[string, any][]>;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAdminCreateGiftCode() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      codeSuffix,
      amount,
      maxClaims,
    }: { codeSuffix: string; amount: bigint; maxClaims: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).adminCreateGiftCode(codeSuffix, amount, maxClaims);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminAllGiftCodes"] }),
  });
}

export function useAdminToggleGiftCode() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      code,
      isActive,
    }: { code: string; isActive: boolean }) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).adminToggleGiftCode(code, isActive);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminAllGiftCodes"] }),
  });
}
