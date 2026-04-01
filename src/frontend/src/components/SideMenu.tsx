import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ExternalLink,
  LayoutDashboard,
  Mail,
  RotateCcw,
  ScrollText,
  Shield,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onDashboard: () => void;
}

type ContentView = null | "rules" | "contact";

const rulesContent = `1. Account & Security Rules

• Single Account: Ek user sirf ek hi mobile number se account bana sakta hai. Duplicate accounts block kar diye jayenge.

• MPIN Confidentiality: Aapka 4-digit MPIN aapki niji zimmedari hai. Isse kisi ke saath share na karein.

• Security Lock: Agar aap 3 baar galat MPIN daalte hain, toh security ke liye aapka account 30 minute ke liye auto-lock ho jayega. Is period mein koi bhi transaction nahi ho sakega.

2. API Activation & Usage

• Activation Fee: API service active karne ke liye prescribed fee deni hogi. Ye fee non-refundable hai.

• Manual Verification: API activation ke liye upload kiya gaya screenshot aur Transaction ID admin dwara verify kiya jayega. Galat ya fake screenshot upload karne par account permanently ban ho sakta hai.

• Automatic Processing: Ek baar API active hone ke baad, saari transactions user ke wallet balance se automatic deduct hongi. Iske liye kisi manual confirmation ki zarurat nahi hogi.

3. Deposit & Withdrawal Rules

• Minimum Deposit/Withdrawal: System mein set kiya gaya minimum amount hi add ya withdraw kiya ja sakta hai.

• Transaction Time: Withdrawals admin approval ke baad process hote hain. Isme 30 minute se lekar 24 ghante tak ka samay lag sakta hai.

• Screenshot Policy: Har deposit ke baad correct Transaction ID aur Screenshot upload karna anivarya (mandatory) hai.

4. Prohibited Activities (Ban Rules)

• Fraudulent Activity: Kisi bhi tarah ka fraud, hacking attempt, ya system glitch ka fayda uthane par account turant terminate kar diya jayega.

• Fake Receipts: Edit kiye huye ya purane screenshots upload karna sakt mana hai.

• Third-Party Integration: Hamari API ko sirf authorized platforms par hi use kiya ja sakta hai. Kisi illegal site par integration milne par API key revoke kar di jayegi.

5. Rights of SR TECHNOLOGY LTD™

• Admin ke paas ye adhikaar (right) hai ki wo kisi bhi sandigdh (suspicious) account ko bina kisi purv suchna (prior notice) ke hold par rakh sake.

• System updates ya maintenance ke dauran services kuch samay ke liye band ho sakti hain.`;

function ContentModal({
  view,
  onClose,
}: { view: Exclude<ContentView, null>; onClose: () => void }) {
  // view is "rules" when not contact

  if (view === "contact") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", damping: 24, stiffness: 280 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-lg bg-card border border-border rounded-t-3xl sm:rounded-2xl overflow-hidden max-h-[85vh] flex flex-col"
          data-ocid="contact.modal"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card sticky top-0">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-foreground">
                ✉️ Contact Us
              </span>
            </div>
            <button
              type="button"
              data-ocid="contact.close_button"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-5 pt-3 pb-1">
            <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/30 rounded-full px-3 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-xs text-primary font-semibold tracking-wide">
                SR TECHNOLOGY LTD™
              </span>
            </div>
          </div>
          <div className="px-5 py-6 space-y-4">
            <div className="bg-muted/50 border border-border rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Email Support
                  </p>
                  <p className="text-foreground font-bold text-sm">
                    sk190rihan@gmail.com
                  </p>
                </div>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Agar aapko koi bhi problem aa rahi hai -- chahe wo transaction
                  issue ho, account problem ho, ya koi bhi sawaal ho -- toh is
                  email par sampark karein.
                </p>
              </div>
            </div>
            <a
              href="mailto:sk190rihan@gmail.com"
              className="flex items-center justify-center gap-2 w-full py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              <Mail className="w-4 h-4" />
              Send Email
            </a>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", damping: 24, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-card border border-border rounded-t-3xl sm:rounded-2xl overflow-hidden max-h-[85vh] flex flex-col"
        data-ocid="rules.modal"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card sticky top-0">
          <div className="flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground">
              📜 Official Rules & Terms
            </span>
          </div>
          <button
            type="button"
            data-ocid="rules.close_button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 pt-3 pb-1">
          <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/30 rounded-full px-3 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-xs text-primary font-semibold tracking-wide">
              SR TECHNOLOGY LTD™
            </span>
          </div>
        </div>
        <ScrollArea className="flex-1 px-5 py-3">
          <div className="whitespace-pre-line text-sm text-muted-foreground leading-relaxed pb-6">
            {rulesContent}
          </div>
        </ScrollArea>
      </motion.div>
    </motion.div>
  );
}

export default function SideMenu({
  isOpen,
  onClose,
  onDashboard,
}: SideMenuProps) {
  const [contentView, setContentView] = useState<ContentView>(null);

  function handleClose() {
    setContentView(null);
    onClose();
  }

  const menuItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      sublabel: "Home pe wapas jaao",
      ocid: "sidemenu.dashboard.button",
      onClick: () => {
        handleClose();
        onDashboard();
      },
    },
    {
      icon: ScrollText,
      label: "Rules",
      sublabel: "Terms of Service",
      ocid: "sidemenu.rules.button",
      onClick: () => setContentView("rules"),
    },
    {
      icon: Shield,
      label: "Privacy Policy",
      sublabel: "Data & security info",
      ocid: "sidemenu.privacy.button",
      onClick: () => {
        window.open(
          "https://www.freeprivacypolicy.com/live/d9463705-dae2-4369-a962-59c8cc429a22",
          "_blank",
        );
      },
    },
    {
      icon: RotateCcw,
      label: "Refund Policy",
      sublabel: "Returns & refunds",
      ocid: "sidemenu.refund.button",
      onClick: () => {
        window.open(
          "https://www.freeprivacypolicy.com/live/fc1b00d4-f31c-4c51-9dd8-d36ccd9aa097",
          "_blank",
        );
      },
    },
    {
      icon: Mail,
      label: "Contact Us",
      sublabel: "sk190rihan@gmail.com",
      ocid: "sidemenu.contact.button",
      onClick: () => setContentView("contact"),
    },
  ];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60"
              onClick={handleClose}
            />

            {/* Drawer */}
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              className="fixed top-0 left-0 h-full w-72 z-50 bg-card border-r border-border flex flex-col shadow-2xl"
              data-ocid="sidemenu.panel"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center">
                    <span className="text-primary font-bold text-xs">SR</span>
                  </div>
                  <div>
                    <p className="text-foreground font-bold text-sm leading-tight">
                      SR GATEWAY IN
                    </p>
                    <p className="text-muted-foreground text-xs">
                      SR TECHNOLOGY LTD™
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  data-ocid="sidemenu.close_button"
                  onClick={handleClose}
                  className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Menu Items */}
              <nav className="flex-1 p-4 space-y-2">
                {menuItems.map(
                  ({ icon: Icon, label, sublabel, ocid, onClick }) => (
                    <button
                      key={ocid}
                      type="button"
                      data-ocid={ocid}
                      onClick={onClick}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-muted/50 hover:bg-primary/10 hover:border-primary/40 border border-transparent transition-all text-left group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 group-hover:bg-primary/30 transition-colors">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-foreground text-sm font-semibold leading-tight">
                          {label}
                        </p>
                        <p className="text-muted-foreground text-xs mt-0.5">
                          {sublabel}
                        </p>
                      </div>
                    </button>
                  ),
                )}
              </nav>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  © {new Date().getFullYear()} SR TECHNOLOGY LTD™
                </p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Content Modals */}
      <AnimatePresence>
        {contentView !== null && (
          <ContentModal
            view={contentView}
            onClose={() => setContentView(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
