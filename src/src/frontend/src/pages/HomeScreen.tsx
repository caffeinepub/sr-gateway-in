import { Button } from "@/components/ui/button";
import {
  ArrowUp,
  ChevronRight,
  Droplets,
  Flame,
  Megaphone,
  Plus,
  Shield,
  Smartphone,
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
import { useBalance, usePaymentSettings } from "../hooks/useQueries";
import { formatRupees } from "../utils/format";

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
  const { data: balance } = useBalance();
  const { data: settings } = usePaymentSettings();
  const { getBlobUrl } = useBlobStorage();

  useEffect(() => {
    const t = setInterval(
      () => setBannerIndex((i) => (i + 1) % bannerSlides.length),
      3000,
    );
    return () => clearInterval(t);
  }, []);

  const slide = bannerSlides[bannerIndex];

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

      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Announcement Bar */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            {
              text: "🔐 3 galat MPIN = 30 min lock",
              color: "bg-rose-500/15 border-rose-500/30 text-rose-400",
            },
            {
              text: "⚡ Fast Payout Guaranteed",
              color: "bg-primary/15 border-primary/30 text-primary",
            },
            {
              text: "🛡️ Secure ICP-Based Gateway",
              color: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
            },
            {
              text: "💼 SR TECHNOLOGY LTD™",
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
          {settings?.bannerBlobId ? (
            <img
              src={getBlobUrl(settings.bannerBlobId)}
              alt="Banner"
              className="w-full h-40 object-cover rounded-2xl border border-primary/20"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
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
          )}
          {/* Dots - only show for default slider */}
          {!settings?.bannerBlobId && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {bannerSlides.map((_, i) => (
                <button
                  // biome-ignore lint/suspicious/noArrayIndexKey: static list
                  key={i}
                  type="button"
                  onClick={() => setBannerIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === bannerIndex ? "w-4 bg-primary" : "w-1.5 bg-white/30"
                  }`}
                />
              ))}
            </div>
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
                {balance !== undefined ? formatRupees(balance) : "₹0.00"}
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
                onClick={() => toast.info(`${label} — Coming Soon!`)}
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
      </div>

      <footer className="text-center py-4 px-4 text-xs text-muted-foreground border-t border-border">
        © {new Date().getFullYear()}. Built with love using{" "}
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
