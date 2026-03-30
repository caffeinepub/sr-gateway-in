import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface ApiStatusResult {
    balance: bigint;
    isActive: boolean;
}
export type Time = bigint;
export type RequestStatus = {
    __kind__: "pending";
    pending: null;
} | {
    __kind__: "approved";
    approved: Time;
} | {
    __kind__: "rejected";
    rejected: Time;
};
export interface MpinVerifyResult {
    attemptsLeft: bigint;
    success: boolean;
    lockedUntil?: Time;
}
export interface MpinStatus {
    isSet: boolean;
    failedAttempts: bigint;
    lockedUntil?: Time;
}
export interface ApiConfig {
    activationFee: bigint;
    paymentMobileNumber: string;
    merchantUpiId: string;
    qrCodeBlobId: string;
}
export interface Transaction {
    id: string;
    status: Variant_pending_approved_rejected;
    transactionType: {
        __kind__: "withdraw";
        withdraw: null;
    } | {
        __kind__: "p2pReceive";
        p2pReceive: Principal;
    } | {
        __kind__: "deposit";
        deposit: null;
    } | {
        __kind__: "p2pSend";
        p2pSend: Principal;
    };
    timestamp: Time;
    amount: bigint;
    associatedParty?: Principal;
}
export interface PendingApiActivation {
    request: ApiActivationRequest;
    user: Principal;
}
export interface PaymentSettings {
    phonePeNumber: string;
    googlePayNumber: string;
    paytmNumber: string;
    upiId: string;
    qrCodeBlobId: string;
    announcementText: string;
    bannerBlobId: string;
}
export interface ApiData {
    token?: string;
    activationRequests: Array<ApiActivationRequest>;
    isActive: boolean;
}
export interface ApiActivationRequest {
    status: {
        __kind__: "pending";
        pending: null;
    } | {
        __kind__: "approved";
        approved: Time;
    } | {
        __kind__: "rejected";
        rejected: Time;
    };
    timestamp: Time;
    proofBlobId: string;
    transactionId: string;
}
export interface DepositRequest {
    timestamp: Time;
    proofBlobId: string;
    amount: bigint;
}
export interface ApiPaymentResult {
    newBalance: bigint;
    message: string;
    success: boolean;
}
export interface WithdrawalRequest {
    upiDetails: string;
    timestamp: Time;
    amount: bigint;
}
export interface UserProfile {
    balance: bigint;
    displayName: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum Variant_pending_approved_rejected {
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
}
export interface Message {
    id: string;
    text: string;
    timestamp: Time;
    isRead: boolean;
    isGlobal: boolean;
}
export interface ChatQueueStatus {
    position: bigint;
    isActive: boolean;
    queueLength: bigint;
    mobileNumber: string;
}
export interface ChatMessage {
    id: string;
    senderIsAdmin: boolean;
    text: string;
    timestamp: bigint;
}
export interface ActiveChatInfo {
    user: Principal;
    mobileNumber: string;
    joinedAt: bigint;
}
export interface ChatQueueEntry {
    user: Principal;
    mobileNumber: string;
    joinedAt: bigint;
}
export interface backendInterface {
    adjustBalance(user: Principal, newBalance: bigint): Promise<void>;
    approveApiActivation(user: Principal, approved: boolean): Promise<void>;
    approveDeposit(user: Principal, index: bigint, approved: boolean): Promise<void>;
    approveWithdrawal(user: Principal, index: bigint, approved: boolean): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteCallerUserProfile(): Promise<void>;
    getAllUsers(): Promise<Array<[Principal, UserProfile]>>;
    getApiConfig(): Promise<ApiConfig>;
    getApiStatus(token: string): Promise<ApiStatusResult>;
    getBalance(): Promise<bigint>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getMpinStatus(): Promise<MpinStatus>;
    getPaymentSettings(): Promise<PaymentSettings>;
    getPendingApiActivationRequests(): Promise<Array<PendingApiActivation>>;
    getPendingDepositRequests(): Promise<Array<[Principal, Array<[DepositRequest, RequestStatus]>]>>;
    getPendingWithdrawalRequests(): Promise<Array<[Principal, Array<[WithdrawalRequest, RequestStatus]>]>>;
    getProfile(profileOwner: Principal): Promise<UserProfile | null>;
    getTransactionHistory(user: Principal): Promise<Array<Transaction>>;
    getTransactions(): Promise<Array<Transaction>>;
    getUserApiData(): Promise<ApiData>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    hasUserCredentials(): Promise<boolean>;
    initializeAsAdmin(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    p2pTransfer(to: Principal, amount: bigint): Promise<void>;
    p2pTransferByMobile(recipientMobileHash: string, amount: bigint): Promise<void>;
    processApiPayment(token: string, amount: bigint, number: string): Promise<ApiPaymentResult>;
    revokeApiToken(user: Principal): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setMpin(mpinHash: string): Promise<void>;
    isMobileHashRegistered(mobileHash: string): Promise<boolean>;
    setUserCredentials(mobileHash: string, passwordHash: string): Promise<void>;
    submitApiActivationRequest(proofBlobId: string, transactionId: string): Promise<void>;
    submitDepositRequest(amount: bigint, proofBlobId: string): Promise<void>;
    submitWithdrawalRequest(amount: bigint, upiDetails: string): Promise<void>;
    updateApiConfig(newConfig: ApiConfig): Promise<void>;
    updateDisplayName(newName: string): Promise<void>;
    updatePaymentSettings(newSettings: PaymentSettings): Promise<void>;
    verifyMpin(mpinHash: string): Promise<MpinVerifyResult>;
    verifyUserCredentials(mobileHash: string, passwordHash: string): Promise<boolean>;
    getMessages(): Promise<Array<Message>>;
    getUnreadMessageCount(): Promise<bigint>;
    markAllMessagesRead(): Promise<void>;
    sendGlobalMessage(text: string): Promise<void>;
    sendPersonalMessage(user: Principal, text: string): Promise<void>;
    joinChatQueue(mobileNumber: string): Promise<ChatQueueStatus>;
    leaveChatQueue(): Promise<void>;
    getChatQueueStatus(): Promise<ChatQueueStatus>;
    sendChatMessage(text: string): Promise<void>;
    getChatMessages(): Promise<Array<ChatMessage>>;
    getActiveChatInfo(): Promise<ActiveChatInfo | null>;
    getChatQueueList(): Promise<Array<ChatQueueEntry>>;
    adminSendChatMessage(text: string): Promise<void>;
    endCurrentChat(): Promise<void>;
}
