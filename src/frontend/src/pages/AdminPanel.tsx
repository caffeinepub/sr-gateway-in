import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Principal } from "@icp-sdk/core/principal";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type {
  ApiConfig,
  DepositRequest,
  WithdrawalRequest,
} from "../backend.d";
import { useBlobStorage } from "../hooks/useBlobStorage";
import {
  useAdjustBalance,
  useAllUsers,
  useApiConfig,
  useApproveApiActivation,
  useApproveDeposit,
  useApproveWithdrawal,
  usePaymentSettings,
  usePendingApiActivations,
  usePendingDeposits,
  usePendingWithdrawals,
  useSendGlobalMessage,
  useUpdateApiConfig,
  useUpdatePaymentSettings,
} from "../hooks/useQueries";
import { formatRupees } from "../utils/format";

const SKELETON_KEYS = ["sk-1", "sk-2", "sk-3"];

interface AdminPanelProps {
  onBack: () => void;
}

const adminGuide = [
  {
    tab: "Deposits",
    icon: "💰",
    desc: "Pending deposit requests dekho aur approve/reject karo. Har request mein user ka payment screenshot zoom karke check karo.",
  },
  {
    tab: "Withdraw",
    icon: "⬆️",
    desc: "Pending withdrawal requests dekho. Approve karte hi user ke wallet se amount deduct hoga.",
  },
  {
    tab: "Users",
    icon: "👥",
    desc: "Sab registered users ki list dekho -- unka balance aur account details check karo.",
  },
  {
    tab: "API Req",
    icon: "🔑",
    desc: "API activation requests yahan aate hain. Screenshot verify karke approve karo -- approve hote hi user ka API token unlock ho jayega.",
  },
  {
    tab: "Settings",
    icon: "⚙️",
    desc: "Payment details update karo: UPI ID, PhonePe/Paytm/GPay numbers, QR code, home banner image, aur announcement text set karo.",
  },
];

export default function AdminPanel({ onBack }: AdminPanelProps) {
  const [guideOpen, setGuideOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const adminSections = [
    {
      id: "deposits",
      icon: "💰",
      label: "Deposits",
      desc: "Deposit requests approve/reject karo",
    },
    {
      id: "withdrawals",
      icon: "⬆️",
      label: "Withdrawals",
      desc: "Withdrawal requests manage karo",
    },
    {
      id: "users",
      icon: "👥",
      label: "Users",
      desc: "Registered users aur balances dekho",
    },
    {
      id: "apirequests",
      icon: "🔑",
      label: "API Requests",
      desc: "API activation requests approve karo",
    },
    {
      id: "settings",
      icon: "⚙️",
      label: "Settings",
      desc: "Payment, banner, API config update karo",
    },
    {
      id: "globalmessage",
      icon: "📢",
      label: "Global Message",
      desc: "Sab users ko message bhejo",
    },
  ];

  return (
    <div className="flex flex-col min-h-full animate-slide-in">
      <header className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border sticky top-0 z-10">
        <button
          type="button"
          data-ocid="admin.back.button"
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-foreground">Admin Panel</h1>
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            data-ocid="admin.guide.button"
            onClick={() => setGuideOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-semibold"
          >
            <Info className="w-3.5 h-3.5" />
            Guide
            {guideOpen ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
          <Badge className="bg-primary/20 text-primary border-0">Admin</Badge>
        </div>
      </header>

      {/* Admin Guide Panel */}
      {guideOpen && (
        <div className="mx-4 mt-3 bg-card border border-primary/20 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-primary/5">
            <p className="text-xs font-bold text-primary uppercase tracking-wide">
              Admin Panel Navigation Guide
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Har tab kya karta hai -- ek baar padho, sab samajh jaega
            </p>
          </div>
          <div className="divide-y divide-border">
            {adminGuide.map((item) => (
              <div key={item.tab} className="flex gap-3 px-4 py-3">
                <span className="text-lg shrink-0 mt-0.5">{item.icon}</span>
                <div>
                  <p className="text-xs font-bold text-foreground">
                    {item.tab}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 px-4 py-4">
        {/* Central feature menu or selected feature */}
        {!activeSection ? (
          <div className="flex flex-col items-center gap-6">
            <div className="text-center mt-2">
              <p className="text-muted-foreground text-sm">
                Kaunsa section kholna hai?
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Neeche se feature select karo
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full">
              {adminSections.map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveSection(sec.id)}
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl border border-border bg-card hover:border-primary/60 hover:bg-primary/5 transition-all shadow-md group"
                  style={{ boxShadow: "0 0 12px rgba(99,102,241,0.15)" }}
                >
                  <span className="text-3xl">{sec.icon}</span>
                  <div className="text-center">
                    <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      {sec.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                      {sec.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={() => setActiveSection(null)}
              className="flex items-center gap-2 mb-4 text-sm text-primary font-semibold px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Wapas Menu Par
            </button>
            {activeSection === "deposits" && <PendingDeposits />}
            {activeSection === "withdrawals" && <PendingWithdrawals />}
            {activeSection === "users" && <UsersTab />}
            {activeSection === "apirequests" && <ApiRequestsTab />}
            {activeSection === "settings" && (
              <div className="space-y-6">
                <SettingsTab />
                <ApiConfigTab />
              </div>
            )}
            {activeSection === "globalmessage" && <GlobalMessageTab />}
          </div>
        )}
      </div>
    </div>
  );
}

function PendingDeposits() {
  const { data, isLoading } = usePendingDeposits();
  const approveDeposit = useApproveDeposit();
  const { getBlobUrl } = useBlobStorage();
  const [zoomImg, setZoomImg] = useState<string | null>(null);

  const handleApprove = async (
    user: Principal,
    index: bigint,
    approved: boolean,
  ) => {
    try {
      await approveDeposit.mutateAsync({ user, index, approved });
      toast.success(approved ? "Deposit approved!" : "Deposit rejected");
    } catch {
      toast.error("Action failed");
    }
  };

  if (isLoading) return <LoadingSkeleton />;

  const allRequests: Array<{
    user: Principal;
    request: DepositRequest;
    index: bigint;
  }> = [];
  if (data) {
    for (const [user, requests] of data) {
      requests.forEach(([req, status], idx) => {
        if (status.__kind__ === "pending") {
          allRequests.push({ user, request: req, index: BigInt(idx) });
        }
      });
    }
  }

  if (allRequests.length === 0)
    return <EmptyState message="No pending deposits" />;

  return (
    <div className="space-y-3" data-ocid="admin.deposits.list">
      {allRequests.map(({ user, request, index }, idx) => (
        <div
          key={`${user.toString()}-${index.toString()}`}
          data-ocid={`admin.deposits.item.${idx + 1}`}
          className="bg-card border border-border rounded-2xl p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                {user.toString()}
              </p>
              <p className="font-bold text-foreground">
                {formatRupees(request.amount)}
              </p>
            </div>
            <Badge className="bg-amber-500/20 text-amber-400 border-0 text-xs">
              Pending
            </Badge>
          </div>
          {zoomImg && (
            <div
              className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
              onClick={() => setZoomImg(null)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setZoomImg(null);
              }}
              aria-modal="true"
            >
              <img
                src={zoomImg}
                alt="Screenshot"
                className="max-w-full max-h-full rounded-xl object-contain"
              />
              <button
                type="button"
                className="absolute top-4 right-4 text-white"
                onClick={() => setZoomImg(null)}
              >
                <X className="w-8 h-8" />
              </button>
            </div>
          )}
          {request.proofBlobId && (
            <button
              type="button"
              onClick={() => setZoomImg(getBlobUrl(request.proofBlobId))}
              className="w-full cursor-zoom-in"
            >
              <img
                src={getBlobUrl(request.proofBlobId)}
                alt="Payment proof"
                className="w-full h-32 object-cover rounded-xl border border-border"
              />
            </button>
          )}
          <div className="flex gap-2">
            <Button
              data-ocid={`admin.deposits.approve.button.${idx + 1}`}
              size="sm"
              onClick={() => handleApprove(user, index, true)}
              disabled={approveDeposit.isPending}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
            >
              <Check className="w-4 h-4 mr-1" /> Approve
            </Button>
            <Button
              data-ocid={`admin.deposits.reject.button.${idx + 1}`}
              size="sm"
              variant="outline"
              onClick={() => handleApprove(user, index, false)}
              disabled={approveDeposit.isPending}
              className="flex-1 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-xl"
            >
              <X className="w-4 h-4 mr-1" /> Reject
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function PendingWithdrawals() {
  const { data, isLoading } = usePendingWithdrawals();
  const approveWithdrawal = useApproveWithdrawal();

  const handleApprove = async (
    user: Principal,
    index: bigint,
    approved: boolean,
  ) => {
    try {
      await approveWithdrawal.mutateAsync({ user, index, approved });
      toast.success(approved ? "Withdrawal approved!" : "Withdrawal rejected");
    } catch {
      toast.error("Action failed");
    }
  };

  if (isLoading) return <LoadingSkeleton />;

  const allRequests: Array<{
    user: Principal;
    request: WithdrawalRequest;
    index: bigint;
  }> = [];
  if (data) {
    for (const [user, requests] of data) {
      requests.forEach(([req, status], idx) => {
        if (status.__kind__ === "pending") {
          allRequests.push({ user, request: req, index: BigInt(idx) });
        }
      });
    }
  }

  if (allRequests.length === 0)
    return <EmptyState message="No pending withdrawals" />;

  return (
    <div className="space-y-3" data-ocid="admin.withdrawals.list">
      {allRequests.map(({ user, request, index }, idx) => (
        <div
          key={`${user.toString()}-${index.toString()}`}
          data-ocid={`admin.withdrawals.item.${idx + 1}`}
          className="bg-card border border-border rounded-2xl p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                {user.toString()}
              </p>
              <p className="font-bold text-foreground">
                {formatRupees(request.amount)}
              </p>
            </div>
            <Badge className="bg-amber-500/20 text-amber-400 border-0 text-xs">
              Pending
            </Badge>
          </div>
          <div className="bg-muted rounded-xl p-3">
            <p className="text-xs text-muted-foreground">UPI / Bank Details</p>
            <p className="text-foreground text-sm">{request.upiDetails}</p>
          </div>
          <div className="flex gap-2">
            <Button
              data-ocid={`admin.withdrawals.approve.button.${idx + 1}`}
              size="sm"
              onClick={() => handleApprove(user, index, true)}
              disabled={approveWithdrawal.isPending}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
            >
              <Check className="w-4 h-4 mr-1" /> Approve
            </Button>
            <Button
              data-ocid={`admin.withdrawals.reject.button.${idx + 1}`}
              size="sm"
              variant="outline"
              onClick={() => handleApprove(user, index, false)}
              disabled={approveWithdrawal.isPending}
              className="flex-1 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-xl"
            >
              <X className="w-4 h-4 mr-1" /> Reject
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function UsersTab() {
  const { data: users, isLoading } = useAllUsers();
  const adjustBalance = useAdjustBalance();
  const [adjustingIdx, setAdjustingIdx] = useState<number | null>(null);
  const [creditAmount, setCreditAmount] = useState("");

  if (isLoading) return <LoadingSkeleton />;
  if (!users || users.length === 0)
    return <EmptyState message="No users yet" />;

  const handleCredit = async (
    principal: Principal,
    currentBalance: bigint,
    _idx: number,
  ) => {
    const amt = Number.parseFloat(creditAmount);
    if (Number.isNaN(amt) || amt <= 0) {
      toast.error("Valid amount daalen");
      return;
    }
    try {
      const addPaise = BigInt(Math.round(amt * 100));
      await adjustBalance.mutateAsync({
        user: principal,
        newBalance: currentBalance + addPaise,
      });
      toast.success(`₹${amt} credited successfully!`);
      setAdjustingIdx(null);
      setCreditAmount("");
    } catch {
      toast.error("Credit failed");
    }
  };

  return (
    <div className="space-y-3" data-ocid="admin.users.list">
      {users.map(([principal, user], idx) => (
        <div
          key={principal.toString()}
          data-ocid={`admin.users.item.${idx + 1}`}
          className="bg-card border border-border rounded-2xl p-4 space-y-2"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">
                {user.displayName || "Unknown"}
              </p>
              <p className="text-xs text-muted-foreground font-mono truncate max-w-[180px]">
                {principal.toString().slice(0, 20)}...
              </p>
            </div>
            <p className="font-bold text-foreground">
              {formatRupees(user.balance)}
            </p>
          </div>
          {adjustingIdx === idx ? (
            <div className="flex gap-2">
              <Input
                data-ocid={`admin.users.credit.input.${idx + 1}`}
                type="number"
                min="1"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="Credit amount (₹)"
                className="bg-muted border-border text-foreground h-9 text-sm"
              />
              <Button
                data-ocid={`admin.users.credit.save_button.${idx + 1}`}
                size="sm"
                onClick={() => handleCredit(principal, user.balance, idx)}
                disabled={adjustBalance.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-9"
              >
                {adjustBalance.isPending ? "..." : "Credit"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setAdjustingIdx(null);
                  setCreditAmount("");
                }}
                className="h-9"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              data-ocid={`admin.users.edit_button.${idx + 1}`}
              size="sm"
              variant="outline"
              onClick={() => {
                setAdjustingIdx(idx);
                setCreditAmount("");
              }}
              className="w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 rounded-xl h-8"
            >
              + Credit Amount
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

function ApiRequestsTab() {
  const { data, isLoading } = usePendingApiActivations();
  const approveApi = useApproveApiActivation();
  const { getBlobUrl } = useBlobStorage();
  const [zoomImg, setZoomImg] = useState<string | null>(null);

  const handleApprove = async (user: Principal, approved: boolean) => {
    try {
      await approveApi.mutateAsync({ user, approved });
      toast.success(
        approved ? "API activation approved!" : "API activation rejected",
      );
    } catch {
      toast.error("Action failed");
    }
  };

  if (isLoading) return <LoadingSkeleton />;
  if (!data || data.length === 0)
    return <EmptyState message="No pending API activation requests" />;

  return (
    <div className="space-y-3" data-ocid="admin.apirequests.list">
      {data.map(({ user, request }, idx) => (
        <div
          key={`${user.toString()}-${idx}`}
          data-ocid={`admin.apirequests.item.${idx + 1}`}
          className="bg-card border border-border rounded-2xl p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">User</p>
              <p className="text-xs font-mono text-foreground truncate max-w-[200px]">
                {user.toString()}
              </p>
            </div>
            <Badge className="bg-amber-500/20 text-amber-400 border-0 text-xs">
              Pending
            </Badge>
          </div>
          <div className="bg-muted rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Transaction ID</p>
            <p className="text-foreground text-sm font-mono">
              {request.transactionId}
            </p>
          </div>
          {zoomImg && (
            <div
              className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
              onClick={() => setZoomImg(null)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setZoomImg(null);
              }}
              aria-modal="true"
            >
              <img
                src={zoomImg}
                alt="Screenshot"
                className="max-w-full max-h-full rounded-xl object-contain"
              />
              <button
                type="button"
                className="absolute top-4 right-4 text-white"
                onClick={() => setZoomImg(null)}
              >
                <X className="w-8 h-8" />
              </button>
            </div>
          )}
          {request.proofBlobId && (
            <button
              type="button"
              onClick={() => setZoomImg(getBlobUrl(request.proofBlobId))}
              className="w-full cursor-zoom-in"
            >
              <img
                src={getBlobUrl(request.proofBlobId)}
                alt="Payment proof"
                className="w-full h-32 object-cover rounded-xl border border-border"
              />
            </button>
          )}
          <div className="flex gap-2">
            <Button
              data-ocid={`admin.apirequests.approve.button.${idx + 1}`}
              size="sm"
              onClick={() => handleApprove(user, true)}
              disabled={approveApi.isPending}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
            >
              <Check className="w-4 h-4 mr-1" /> Approve
            </Button>
            <Button
              data-ocid={`admin.apirequests.reject.button.${idx + 1}`}
              size="sm"
              variant="outline"
              onClick={() => handleApprove(user, false)}
              disabled={approveApi.isPending}
              className="flex-1 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-xl"
            >
              <X className="w-4 h-4 mr-1" /> Reject
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsTab() {
  const { data: settings } = usePaymentSettings();
  const updateSettings = useUpdatePaymentSettings();
  const { uploadBlob, getBlobUrl } = useBlobStorage();

  const [upiId, setUpiId] = useState("");
  const [phonePeNumber, setPhonePeNumber] = useState("");
  const [paytmNumber, setPaytmNumber] = useState("");
  const [googlePayNumber, setGooglePayNumber] = useState("");
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrBlobId, setQrBlobId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [announcementText, setAnnouncementText] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerBlobId, setBannerBlobId] = useState("");
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (settings && !synced) {
      setUpiId(settings.upiId || "");
      setPhonePeNumber(settings.phonePeNumber || "");
      setPaytmNumber(settings.paytmNumber || "");
      setGooglePayNumber(settings.googlePayNumber || "");
      setQrBlobId(settings.qrCodeBlobId || "");
      setAnnouncementText(settings.announcementText || "");
      setBannerBlobId(settings.bannerBlobId || "");
      setSynced(true);
    }
  }, [settings, synced]);

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalQrBlobId = qrBlobId;
    if (qrFile) {
      try {
        setUploading(true);
        finalQrBlobId = await uploadBlob(qrFile);
        setQrBlobId(finalQrBlobId);
        setQrFile(null);
      } catch {
        toast.error("Failed to upload QR image");
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    }
    try {
      await updateSettings.mutateAsync({
        upiId,
        phonePeNumber,
        paytmNumber,
        googlePayNumber,
        qrCodeBlobId: finalQrBlobId,
        announcementText,
        bannerBlobId,
      });
      toast.success("Payment settings saved!");
    } catch {
      toast.error("Failed to save payment settings");
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalBannerBlobId = bannerBlobId;
    if (bannerFile) {
      try {
        setUploading(true);
        finalBannerBlobId = await uploadBlob(bannerFile);
        setBannerBlobId(finalBannerBlobId);
        setBannerFile(null);
      } catch {
        toast.error("Failed to upload banner");
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    }
    try {
      await updateSettings.mutateAsync({
        upiId,
        phonePeNumber,
        paytmNumber,
        googlePayNumber,
        qrCodeBlobId: qrBlobId,
        announcementText,
        bannerBlobId: finalBannerBlobId,
      });
      toast.success("Banner saved!");
    } catch {
      toast.error("Failed to save banner");
    }
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings.mutateAsync({
        upiId,
        phonePeNumber,
        paytmNumber,
        googlePayNumber,
        qrCodeBlobId: qrBlobId,
        announcementText,
        bannerBlobId,
      });
      toast.success("Announcement text saved!");
    } catch {
      toast.error("Failed to save announcement");
    }
  };

  return (
    <div>
      <div className="space-y-6" data-ocid="admin.settings.panel">
        {/* Payment Settings */}
        <form onSubmit={handleSavePayment} className="space-y-4">
          <p className="text-sm font-semibold text-primary">Payment Settings</p>
          <div className="space-y-2">
            <Label htmlFor="upiId" className="text-foreground">
              UPI ID
            </Label>
            <Input
              id="upiId"
              data-ocid="admin.settings.upi.input"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="yourname@upi"
              className="bg-card border-border text-foreground h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phonePe" className="text-foreground">
              PhonePe Number
            </Label>
            <Input
              id="phonePe"
              data-ocid="admin.settings.phonepe.input"
              value={phonePeNumber}
              onChange={(e) => setPhonePeNumber(e.target.value)}
              placeholder="PhonePe registered number"
              className="bg-card border-border text-foreground h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="paytm" className="text-foreground">
              Paytm Number
            </Label>
            <Input
              id="paytm"
              data-ocid="admin.settings.paytm.input"
              value={paytmNumber}
              onChange={(e) => setPaytmNumber(e.target.value)}
              placeholder="Paytm registered number"
              className="bg-card border-border text-foreground h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gpay" className="text-foreground">
              Google Pay Number
            </Label>
            <Input
              id="gpay"
              data-ocid="admin.settings.gpay.input"
              value={googlePayNumber}
              onChange={(e) => setGooglePayNumber(e.target.value)}
              placeholder="Google Pay registered number"
              className="bg-card border-border text-foreground h-12"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">QR Code</Label>
            {qrBlobId && (
              <img
                src={getBlobUrl(qrBlobId)}
                alt="Current QR"
                className="w-40 h-40 object-contain rounded-xl border border-border bg-white p-1"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
            <label
              data-ocid="admin.settings.qr.upload_button"
              className="flex items-center gap-2 border border-dashed border-border rounded-2xl p-4 cursor-pointer hover:border-primary/50 transition-colors"
            >
              <Upload className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {qrFile ? qrFile.name : "Upload QR Code"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setQrFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>
          <Button
            data-ocid="admin.settings.payment.save_button"
            type="submit"
            disabled={uploading || updateSettings.isPending}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl"
          >
            {uploading
              ? "Uploading..."
              : updateSettings.isPending
                ? "Saving..."
                : "Payment Settings Save"}
          </Button>
        </form>

        <div className="border-t border-border pt-4" />

        {/* Banner */}
        <form onSubmit={handleSaveBanner} className="space-y-4">
          <p className="text-sm font-semibold text-primary">Home Banner</p>
          <p className="text-xs text-muted-foreground">
            Yeh image home screen ke banner mein dikhegi
          </p>
          {bannerBlobId && (
            <img
              src={getBlobUrl(bannerBlobId)}
              alt="Current Banner"
              className="w-full h-28 object-cover rounded-xl border border-border"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <label
            data-ocid="admin.settings.banner.upload_button"
            className="flex items-center gap-2 border border-dashed border-border rounded-2xl p-4 cursor-pointer hover:border-primary/50 transition-colors"
          >
            <Upload className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {bannerFile ? bannerFile.name : "Upload Banner Image"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
            />
          </label>
          <Button
            data-ocid="admin.settings.banner.save_button"
            type="submit"
            disabled={uploading || updateSettings.isPending}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl"
          >
            {uploading
              ? "Uploading..."
              : updateSettings.isPending
                ? "Saving..."
                : "Banner Save"}
          </Button>
        </form>

        <div className="border-t border-border pt-4" />

        {/* Announcement */}
        <form onSubmit={handleSaveAnnouncement} className="space-y-4">
          <p className="text-sm font-semibold text-primary">
            Announcement Text
          </p>
          <p className="text-xs text-muted-foreground">
            Home screen pe top mein dikhega
          </p>
          <Input
            id="announcement"
            data-ocid="admin.settings.announcement.input"
            value={announcementText}
            onChange={(e) => setAnnouncementText(e.target.value)}
            placeholder="e.g. Server maintenance on Sunday 2AM-4AM"
            className="bg-card border-border text-foreground h-12"
          />
          <Button
            data-ocid="admin.settings.announcement.save_button"
            type="submit"
            disabled={updateSettings.isPending}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl"
          >
            {updateSettings.isPending ? "Saving..." : "Announcement Text Save"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function ApiConfigTab() {
  const { data: apiConfig } = useApiConfig();
  const updateApiConfig = useUpdateApiConfig();
  const { uploadBlob, getBlobUrl } = useBlobStorage();

  const [activationFee, setActivationFee] = useState(0);
  const [merchantUpiId, setMerchantUpiId] = useState("");
  const [paymentMobileNumber, setPaymentMobileNumber] = useState("");
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrBlobId, setQrBlobId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [syncedApi, setSyncedApi] = useState(false);

  useEffect(() => {
    if (apiConfig && !syncedApi) {
      setActivationFee(apiConfig ? Number(apiConfig.activationFee) / 100 : 0);
      setMerchantUpiId(apiConfig.merchantUpiId || "");
      setPaymentMobileNumber(apiConfig.paymentMobileNumber || "");
      setQrBlobId(apiConfig.qrCodeBlobId || "");
      setSyncedApi(true);
    }
  }, [apiConfig, syncedApi]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalQrBlobId = qrBlobId;
    if (qrFile) {
      try {
        setUploading(true);
        finalQrBlobId = await uploadBlob(qrFile);
        setQrBlobId(finalQrBlobId);
      } catch {
        toast.error("Failed to upload QR");
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    }
    const config: ApiConfig = {
      activationFee: BigInt(Math.round(activationFee * 100)),
      merchantUpiId,
      paymentMobileNumber,
      qrCodeBlobId: finalQrBlobId,
    };
    try {
      await updateApiConfig.mutateAsync(config);
      toast.success("API config updated!");
    } catch {
      toast.error("Failed to update API config");
    }
  };

  return (
    <div>
      <p className="text-sm font-semibold text-primary mb-3">
        API Service Configuration
      </p>
      <form
        onSubmit={handleSave}
        className="space-y-4"
        data-ocid="admin.apiconfig.panel"
      >
        <div className="space-y-2">
          <Label htmlFor="activationFee" className="text-foreground">
            API Activation Fee (₹)
          </Label>
          <Input
            id="activationFee"
            data-ocid="admin.apiconfig.fee.input"
            type="number"
            min="0"
            step="1"
            value={activationFee}
            onChange={(e) => setActivationFee(Number(e.target.value))}
            placeholder="e.g. 499"
            className="bg-card border-border text-foreground h-12"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="merchantUpi" className="text-foreground">
            Merchant UPI ID
          </Label>
          <Input
            id="merchantUpi"
            data-ocid="admin.apiconfig.upi.input"
            value={merchantUpiId}
            onChange={(e) => setMerchantUpiId(e.target.value)}
            placeholder="merchant@upi"
            className="bg-card border-border text-foreground h-12"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentMobile" className="text-foreground">
            Payment Mobile Number
          </Label>
          <Input
            id="paymentMobile"
            data-ocid="admin.apiconfig.mobile.input"
            value={paymentMobileNumber}
            onChange={(e) => setPaymentMobileNumber(e.target.value)}
            placeholder="10-digit mobile number"
            className="bg-card border-border text-foreground h-12"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">API Payment QR Code</Label>
          {qrBlobId && (
            <img
              src={getBlobUrl(qrBlobId)}
              alt="API QR"
              className="w-40 h-40 object-contain rounded-xl border border-border bg-white p-1"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <label
            data-ocid="admin.apiconfig.qr.upload_button"
            className="flex items-center gap-2 border border-dashed border-border rounded-2xl p-4 cursor-pointer hover:border-primary/50 transition-colors"
          >
            <Upload className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {qrFile ? qrFile.name : "Upload API QR Code"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setQrFile(e.target.files?.[0] || null)}
            />
          </label>
        </div>
        <Button
          data-ocid="admin.apiconfig.submit_button"
          type="submit"
          disabled={uploading || updateApiConfig.isPending}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl"
        >
          {uploading
            ? "Uploading..."
            : updateApiConfig.isPending
              ? "Saving..."
              : "Save API Config"}
        </Button>
      </form>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div data-ocid="admin.loading_state" className="space-y-3">
      {SKELETON_KEYS.map((k) => (
        <div key={k} className="bg-card rounded-2xl p-4 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      data-ocid="admin.empty_state"
      className="flex flex-col items-center justify-center py-12 gap-2"
    >
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}

function GlobalMessageTab() {
  const [text, setText] = useState("");
  const sendMsg = useSendGlobalMessage();

  const handleSend = async () => {
    if (!text.trim()) return;
    try {
      await sendMsg.mutateAsync(text.trim());
      toast.success(
        "Global message bhej diya! Sabhi users ko message mil jayega.",
      );
      setText("");
    } catch (err: any) {
      const errMsg = err?.message || String(err) || "";
      if (
        errMsg.toLowerCase().includes("unauthorized") ||
        errMsg.toLowerCase().includes("admin")
      ) {
        toast.error(
          "Admin access nahi hai. Caffeine dashboard se admin link use karein.",
        );
      } else {
        toast.error(`Message send nahi hua: ${errMsg || "dobara try karo"}`);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-3">
        <p className="text-xs text-primary font-medium">
          📢 Yeh message <strong>sabhi users</strong> ko dikhai dega unke
          Message Box mein.
        </p>
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-foreground">
          Message likhein
        </Label>
        <Textarea
          data-ocid="admin.globalmessage.textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Yahan global message likho..."
          className="min-h-[120px] bg-muted border-border resize-none"
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground text-right">
          {text.length}/500
        </p>
      </div>
      <Button
        data-ocid="admin.globalmessage.submit_button"
        onClick={handleSend}
        disabled={!text.trim() || sendMsg.isPending}
        className="w-full"
        style={{ boxShadow: "0 0 16px rgba(99,102,241,0.6)" }}
      >
        {sendMsg.isPending ? "Bhej raha hai..." : "📢 Sab Users Ko Bhejo"}
      </Button>
    </div>
  );
}
