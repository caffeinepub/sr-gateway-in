import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowUp,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  Droplets,
  Flame,
  Gift,
  Loader2,
  Megaphone,
  MessageCircle,
  Plus,
  Shield,
  Smartphone,
  Sparkles,
  Tv2,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Screen } from "../App";
import Header from "../components/Header";
import MessagePanel from "../components/MessagePanel";
import SideMenu from "../components/SideMenu";
import { useBlobStorage } from "../hooks/useBlobStorage";
import {
  useBalance,
  useClaimGiftCode,
  useCreateGiftCode,
  useMyGiftCodeClaims,
  usePaymentSettings,
} from "../hooks/useQueries";
import { formatDate, formatRupees } from "../utils/format";

const bannerSlides = [
  {
    title: "EXCLUSIVE OFFERS",
    subtitle: "& PARTNER DEALS",
    description: "Get the best deals on recharges and bills",
    cta: "Get Now",
    gradient: "from-[#0f1e4a] to-[#1a3a7a]",
    accentColor: "text-primary",
  },
  {
    title: "FAST PAYOUT",
    subtitle: "GUARANTEED",
    description: "Instant withdrawals within 30 minutes",
    cta: "Withdraw Now",
    gradient: "from-[#0a2a1a] to-[#0f3d2a]",
    accentColor: "text-emerald-400",
  },
  {
    title: "SECURE P2P",
    subtitle: "TRANSFERS",
    description: "Send money directly to any user",
    cta: "Send Now",
    gradient: "from-[#2a0f0f] to-[#3d1a1a]",
    accentColor: "text-rose-400",
  },
];

const services = [
  { icon: Smartphone, label: "Mobile Recharge" },
  { icon: Tv2, label: "DTH Recharge" },
  { icon: Zap, label: "Electricity" },
  { icon: Flame, label: "Gas Bill" },
  { icon: Droplets, label: "Water Bill" },
  { icon: Shield, label: "Insurance" },
];

interface HomeScreenProps {
  onNavigate: (screen: Screen) => void;
}

export default function HomeScreen({ onNavigate }: HomeScreenProps) {
  const [bannerIndex, setBannerIndex] = useState(0);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [claimHistoryOpen, setClaimHistoryOpen] = useState(false);

  // Claim form state
  const [claimCode, setClaimCode] = useState("");

  // Create form state
  const [createSuffix, setCreateSuffix] = useState("");
  const [createAmount, setCreateAmount] = useState("");
  const [createMaxClaims, setCreateMaxClaims] = useState("5");
  const [createdCodeResult, setCreatedCodeResult] = useState<string | null>(
    null,
  );

  const { data: balance } = useBalance();
  const { data: settings } = usePaymentSettings();
  const { getBlobUrl } = useBlobStorage();
  const { data: claimHistory } = useMyGiftCodeClaims();
  const claimMutation = useClaimGiftCode();
  const createMutation = useCreateGiftCode();

  // Parse admin banners (pipe-separated blob IDs)
  const adminBannerIds = (settings?.bannerBlobId || "")
    .split("|")
    .filter(Boolean);
  const hasAdminBanners = adminBannerIds.length > 0;

  // Auto-advance banner every 2 seconds
  useEffect(() => {
    const total = hasAdminBanners ? adminBannerIds.length : bannerSlides.length;
    const t = setInterval(() => setBannerIndex((i) => (i + 1) % total), 2000);
    return () => clearInterval(t);
  }, [hasAdminBanners, adminBannerIds.length]);

  const slide = bannerSlides[bannerIndex % bannerSlides.length];

  const handleClaim = async () => {
    const code = claimCode.trim().toUpperCase();
    if (!code) {
      toast.error("Gift code daalo");
      return;
    }
    try {
      const result = await claimMutation.mutateAsync(code);
      if (result && typeof result === "object" && "ok" in result) {
        const amt = formatRupees(result.ok as bigint);
        toast.success(`✅ ${amt} credited! Gift code successfully claimed.`);
        setClaimCode("");
        setClaimDialogOpen(false);
      } else if (result && typeof result === "object" && "err" in result) {
        toast.error(String((result as any).err));
      } else {
        toast.success("Gift code claimed successfully!");
        setClaimCode("");
        setClaimDialogOpen(false);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Claim failed");
    }
  };

  const handleCreate = async () => {
    const suffix = createSuffix
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    const amount = Number.parseFloat(createAmount);
    const maxClaims = Number.parseInt(createMaxClaims, 10);
    if (!suffix || suffix.length < 1 || suffix.length > 20) {
      toast.error("Code suffix 1-20 characters ka hona chahiye");
      return;
    }
    if (!amount || amount <= 0) {
      toast.error("Valid amount daalo");
      return;
    }
    if (!maxClaims || maxClaims < 1 || maxClaims > 20) {
      toast.error("Max claims 1-20 ke beech honi chahiye");
      return;
    }
    try {
      const result = await createMutation.mutateAsync({
        codeSuffix: suffix,
        amount: BigInt(Math.round(amount * 100)),
        maxClaims: BigInt(maxClaims),
      });
      if (result && typeof result === "object" && "ok" in result) {
        setCreatedCodeResult(String((result as any).ok));
        setCreateSuffix("");
        setCreateAmount("");
        setCreateMaxClaims("5");
      } else if (result && typeof result === "object" && "err" in result) {
        toast.error(String((result as any).err));
      } else {
        toast.success("Gift code created!");
        setCreateDialogOpen(false);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Create failed");
    }
  };

  return (
    <div className="flex flex-col min-h-full animate-slide-in">
      <Header
        onMenuClick={() => setSideMenuOpen(true)}
        onProfileClick={() => onNavigate("profile")}
        onMessageClick={() => setMessageOpen(true)}
      />

      <SideMenu
        isOpen={sideMenuOpen}
        onClose={() => setSideMenuOpen(false)}
        onDashboard={() => setSideMenuOpen(false)}
      />

      <MessagePanel open={messageOpen} onClose={() => setMessageOpen(false)} />

      {/* Claim Gift Code Dialog */}
      <Dialog open={claimDialogOpen} onOpenChange={setClaimDialogOpen}>
        <DialogContent
          className="bg-card border border-amber-500/30 rounded-2xl max-w-sm mx-auto"
          data-ocid="giftcode.claim.dialog"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <Gift className="w-5 h-5" />
              Gift Code Claim Karo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Gift code enter karo — instant wallet credit hoga!
            </p>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">
                Gift Code
              </Label>
              <Input
                data-ocid="giftcode.claim.input"
                placeholder="SRIN_HAPPY100"
                value={claimCode}
                onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
                className="bg-muted border-amber-500/30 text-foreground font-mono"
              />
            </div>
            <Button
              data-ocid="giftcode.claim.submit_button"
              onClick={handleClaim}
              disabled={claimMutation.isPending}
              className="w-full h-11 font-bold rounded-xl text-white"
              style={{
                background:
                  "linear-gradient(135deg, #d97706, #f59e0b, #fbbf24)",
                boxShadow: "0 0 20px rgba(245,158,11,0.5)",
              }}
            >
              {claimMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Gift className="w-4 h-4 mr-2" />
              )}
              {claimMutation.isPending ? "Claiming..." : "Claim Karo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Gift Code Dialog */}
      <Dialog
        open={createDialogOpen}
        onOpenChange={(v) => {
          setCreateDialogOpen(v);
          if (!v) setCreatedCodeResult(null);
        }}
      >
        <DialogContent
          className="bg-card border border-violet-500/30 rounded-2xl max-w-sm mx-auto"
          data-ocid="giftcode.create.dialog"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-violet-400">
              <Sparkles className="w-5 h-5" />
              Gift Code Banao
            </DialogTitle>
          </DialogHeader>
          {createdCodeResult ? (
            <div className="space-y-4">
              <div className="text-center py-2">
                <div className="text-4xl mb-3">🎁</div>
                <p className="font-bold text-foreground text-sm">
                  Gift Code Ready!
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Doston ko share karo
                </p>
              </div>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-xl border border-violet-500/30">
                <span className="font-mono font-bold text-violet-300 text-sm flex-1">
                  {createdCodeResult}
                </span>
                <button
                  type="button"
                  data-ocid="giftcode.created.copy_button"
                  onClick={() => {
                    navigator.clipboard.writeText(createdCodeResult);
                    toast.success("Code copied!");
                  }}
                  className="text-violet-400 hover:text-violet-300"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <Button
                data-ocid="giftcode.create.close_button"
                onClick={() => {
                  setCreateDialogOpen(false);
                  setCreatedCodeResult(null);
                }}
                className="w-full rounded-xl"
                variant="outline"
              >
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Apna gift code banao — doston ko bhejo, woh claim karke paisa
                paayenge!
              </p>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">
                  Code Suffix
                </Label>
                <div className="flex items-center gap-0">
                  <span className="px-3 py-2 bg-violet-500/20 border border-violet-500/30 border-r-0 rounded-l-xl text-violet-300 font-mono text-sm font-bold">
                    SRIN_
                  </span>
                  <Input
                    data-ocid="giftcode.create.suffix_input"
                    placeholder="HAPPY100"
                    value={createSuffix}
                    onChange={(e) =>
                      setCreateSuffix(
                        e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                      )
                    }
                    maxLength={20}
                    className="bg-muted border-violet-500/30 text-foreground font-mono rounded-l-none"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Full code: SRIN_{createSuffix || "HAPPY100"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">
                    Amount (₹)
                  </Label>
                  <Input
                    data-ocid="giftcode.create.amount_input"
                    type="number"
                    placeholder="100"
                    value={createAmount}
                    onChange={(e) => setCreateAmount(e.target.value)}
                    min="1"
                    className="bg-muted border-violet-500/30 text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">
                    Max Claims (1-20)
                  </Label>
                  <Input
                    data-ocid="giftcode.create.maxclaims_input"
                    type="number"
                    placeholder="5"
                    value={createMaxClaims}
                    onChange={(e) => setCreateMaxClaims(e.target.value)}
                    min="1"
                    max="20"
                    className="bg-muted border-violet-500/30 text-foreground"
                  />
                </div>
              </div>
              <Button
                data-ocid="giftcode.create.submit_button"
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="w-full h-11 font-bold rounded-xl text-white"
                style={{
                  background:
                    "linear-gradient(135deg, #7c3aed, #8b5cf6, #a78bfa)",
                  boxShadow: "0 0 20px rgba(139,92,246,0.5)",
                }}
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                {createMutation.isPending ? "Creating..." : "Code Banao"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Announcement Bar */}
        {settings?.announcementText && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10">
            <Megaphone className="shrink-0 mt-0.5 text-amber-400 w-4 h-4" />
            <p className="text-xs text-amber-300 font-medium leading-relaxed">
              {settings.announcementText}
            </p>
          </div>
        )}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            {
              text: "\uD83D\uDD10 3 galat MPIN = 30 min lock",
              color: "bg-rose-500/15 border-rose-500/30 text-rose-400",
            },
            {
              text: "\u26A1 Fast Payout Guaranteed",
              color: "bg-primary/15 border-primary/30 text-primary",
            },
            {
              text: "\uD83D\uDEE1\uFE0F Secure ICP-Based Gateway",
              color: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
            },
            {
              text: "\uD83D\uDCBC SR TECHNOLOGY LTD\u2122",
              color: "bg-amber-500/15 border-amber-500/30 text-amber-400",
            },
          ].map((item) => (
            <div
              key={item.text}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold whitespace-nowrap ${item.color}`}
            >
              {item.text}
            </div>
          ))}
        </div>

        {/* Promotional Banner */}
        <div
          className="relative overflow-hidden rounded-2xl"
          style={{ minHeight: 140 }}
        >
          {hasAdminBanners ? (
            <>
              <AnimatePresence mode="wait">
                <motion.div
                  key={bannerIndex}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-0"
                >
                  <img
                    src={getBlobUrl(
                      adminBannerIds[bannerIndex % adminBannerIds.length],
                    )}
                    alt={`Banner ${(bannerIndex % adminBannerIds.length) + 1}`}
                    className="w-full h-full object-cover rounded-2xl"
                    style={{ minHeight: 140 }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </motion.div>
              </AnimatePresence>
              {/* Dots for admin banners */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {adminBannerIds.map((_, i) => (
                  <button
                    // biome-ignore lint/suspicious/noArrayIndexKey: static list
                    key={i}
                    type="button"
                    onClick={() => setBannerIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === bannerIndex % adminBannerIds.length
                        ? "w-4 bg-primary"
                        : "w-1.5 bg-white/50"
                    }`}
                  />
                ))}
              </div>
            </>
          ) : (
            <>
              <AnimatePresence mode="wait">
                <motion.div
                  key={bannerIndex}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.4 }}
                  className={`absolute inset-0 bg-gradient-to-r ${slide.gradient} rounded-2xl p-5 flex items-center justify-between border border-primary/20`}
                >
                  <div className="flex-1 space-y-1">
                    <p
                      className={`text-xs font-semibold uppercase tracking-widest ${slide.accentColor}`}
                    >
                      {slide.title}
                    </p>
                    <p className="text-white font-bold text-lg leading-tight">
                      {slide.subtitle}
                    </p>
                    <p className="text-white/60 text-xs">{slide.description}</p>
                    <Button
                      data-ocid="banner.primary_button"
                      size="sm"
                      className="mt-2 bg-primary hover:bg-primary/90 text-white text-xs h-7 px-3 rounded-lg btn-glow"
                    >
                      {slide.cta} <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                  <div className="w-20 h-20 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-primary/30 border border-primary/60 flex items-center justify-center">
                      <span className="text-primary font-bold text-sm">SR</span>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
              {/* Dots for default slides */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {bannerSlides.map((_, i) => (
                  <button
                    // biome-ignore lint/suspicious/noArrayIndexKey: static list
                    key={i}
                    type="button"
                    onClick={() => setBannerIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === bannerIndex % bannerSlides.length
                        ? "w-4 bg-primary"
                        : "w-1.5 bg-white/30"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Wallet Balance Card */}
        <div
          className="bg-card border border-primary/30 rounded-2xl p-5 space-y-4"
          data-ocid="wallet.card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Wallet Balance
              </p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {balance !== undefined ? formatRupees(balance) : "\u20B90.00"}
              </p>
            </div>
            <div className="text-right space-y-1">
              <div className="flex items-center gap-1 justify-end">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs text-emerald-400 font-medium">
                  Fast Payout
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Withdrawal Limits: None
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              data-ocid="wallet.add_funds.button"
              onClick={() => onNavigate("addFunds")}
              className="flex-1 h-11 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl btn-glow"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Funds
            </Button>
            <Button
              data-ocid="wallet.withdraw.button"
              onClick={() => onNavigate("withdraw")}
              variant="outline"
              className="flex-1 h-11 border-primary/50 text-primary hover:bg-primary/10 font-semibold rounded-xl btn-glow"
            >
              <ArrowUp className="w-4 h-4 mr-1" /> Withdraw
            </Button>
          </div>
        </div>

        {/* Services Grid */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Services
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {services.map(({ icon: Icon, label }, idx) => (
              <button
                // biome-ignore lint/suspicious/noArrayIndexKey: static list
                key={idx}
                type="button"
                data-ocid={`service.item.${idx + 1}`}
                onClick={() => toast.info(`${label} \u2014 Coming Soon!`)}
                className="bg-card border border-border rounded-2xl p-4 flex flex-col items-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground text-center leading-tight">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Gift Code Section */}
        <div className="space-y-3" data-ocid="giftcode.section">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Gift Codes
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {/* Claim Gift Code Button */}
            <button
              type="button"
              data-ocid="giftcode.claim.open_modal_button"
              onClick={() => setClaimDialogOpen(true)}
              className="relative flex flex-col items-center gap-2.5 p-4 rounded-2xl overflow-hidden transition-all active:scale-95"
              style={{
                background:
                  "linear-gradient(135deg, #78350f 0%, #92400e 50%, #b45309 100%)",
                boxShadow:
                  "0 0 24px rgba(245,158,11,0.45), 0 4px 12px rgba(0,0,0,0.3)",
                border: "1px solid rgba(245,158,11,0.4)",
              }}
            >
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  background:
                    "radial-gradient(circle at 30% 30%, rgba(251,191,36,0.6), transparent 60%)",
                }}
              />
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center relative z-10"
                style={{
                  background: "rgba(245,158,11,0.25)",
                  border: "1px solid rgba(245,158,11,0.5)",
                  boxShadow: "0 0 12px rgba(245,158,11,0.4)",
                }}
              >
                <Gift className="w-6 h-6 text-amber-300" />
              </div>
              <div className="text-center relative z-10">
                <p className="font-bold text-amber-100 text-sm">
                  Claim Gift Code
                </p>
                <p className="text-xs text-amber-300/80 mt-0.5 leading-tight">
                  Code enter karo
                </p>
                <p className="text-xs text-amber-300/80 leading-tight">
                  instant credit!
                </p>
              </div>
            </button>

            {/* Create Gift Code Button */}
            <button
              type="button"
              data-ocid="giftcode.create.open_modal_button"
              onClick={() => setCreateDialogOpen(true)}
              className="relative flex flex-col items-center gap-2.5 p-4 rounded-2xl overflow-hidden transition-all active:scale-95"
              style={{
                background:
                  "linear-gradient(135deg, #3b0764 0%, #4c1d95 50%, #5b21b6 100%)",
                boxShadow:
                  "0 0 24px rgba(139,92,246,0.45), 0 4px 12px rgba(0,0,0,0.3)",
                border: "1px solid rgba(139,92,246,0.4)",
              }}
            >
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  background:
                    "radial-gradient(circle at 70% 30%, rgba(167,139,250,0.6), transparent 60%)",
                }}
              />
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center relative z-10"
                style={{
                  background: "rgba(139,92,246,0.25)",
                  border: "1px solid rgba(139,92,246,0.5)",
                  boxShadow: "0 0 12px rgba(139,92,246,0.4)",
                }}
              >
                <Sparkles className="w-6 h-6 text-violet-300" />
              </div>
              <div className="text-center relative z-10">
                <p className="font-bold text-violet-100 text-sm">
                  Create Gift Code
                </p>
                <p className="text-xs text-violet-300/80 mt-0.5 leading-tight">
                  Apna code banao
                </p>
                <p className="text-xs text-violet-300/80 leading-tight">
                  doston ko bhejo!
                </p>
              </div>
            </button>
          </div>

          {/* Claim History Collapsible */}
          {claimHistory && claimHistory.length > 0 && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <button
                type="button"
                data-ocid="giftcode.history.toggle"
                onClick={() => setClaimHistoryOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold text-foreground">
                    Meri Claim History
                  </span>
                  <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold">
                    {claimHistory.length}
                  </span>
                </div>
                {claimHistoryOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              <AnimatePresence>
                {claimHistoryOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="divide-y divide-border border-t border-border">
                      {claimHistory.map((claim: any, idx: number) => (
                        <div
                          key={String(claim.timestamp)}
                          data-ocid={`giftcode.history.item.${idx + 1}`}
                          className="flex items-center gap-3 px-4 py-3"
                        >
                          <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                            <Gift className="w-4 h-4 text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-mono text-xs font-bold text-foreground truncate">
                              {claim.code}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatDate(claim.timestamp)}
                            </p>
                          </div>
                          <span className="text-sm font-bold text-emerald-400 shrink-0">
                            +{formatRupees(claim.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Live Chat Support */}
        <button
          type="button"
          data-ocid="livechat.open_modal_button"
          onClick={() => onNavigate("livechat")}
          className="w-full flex items-center gap-4 p-4 bg-card border border-primary/30 rounded-2xl hover:border-primary/60 hover:bg-primary/5 transition-all"
          style={{ boxShadow: "0 0 18px rgba(37,99,235,0.25)" }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, #0f1e4a, #1a3a7a)",
              boxShadow: "0 0 16px rgba(37,99,235,0.5)",
            }}
          >
            <MessageCircle className="w-6 h-6 text-primary" />
          </div>
          <div className="text-left flex-1">
            <p className="font-bold text-foreground text-sm">
              Live Chat Support
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Admin se seedha baat karo \u2014 instant support
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">Live</span>
          </div>
        </button>
      </div>

      <footer className="text-center py-4 px-4 text-xs text-muted-foreground border-t border-border">
        \u00A9 {new Date().getFullYear()}. Built with love using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          className="text-primary"
          target="_blank"
          rel="noreferrer"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
