import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowLeftRight, CheckCircle, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import MPinModal from "../components/MPinModal";
import { useBalance, useP2PTransferByMobile } from "../hooks/useQueries";
import { formatRupees } from "../utils/format";

async function hashString(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface P2PScreenProps {
  onBack: () => void;
}

export default function P2PScreen({ onBack }: P2PScreenProps) {
  const [mobile, setMobile] = useState("");
  const [amount, setAmount] = useState("");
  const [success, setSuccess] = useState(false);
  const [showMpinModal, setShowMpinModal] = useState(false);
  const { data: balance } = useBalance();
  const p2pTransfer = useP2PTransferByMobile();

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mobileClean = mobile.replace(/\D/g, "");
    if (mobileClean.length < 10) {
      toast.error("Valid 10-digit mobile number daalen");
      return;
    }
    const amt = Number.parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error("Valid amount daalen");
      return;
    }
    if (balance !== undefined && BigInt(Math.round(amt * 100)) > balance) {
      toast.error("Insufficient balance");
      return;
    }
    setShowMpinModal(true);
  };

  const handlePinSuccess = async () => {
    setShowMpinModal(false);
    const mobileClean = mobile.replace(/\D/g, "");
    const amt = Number.parseFloat(amount);
    try {
      const recipientMobileHash = await hashString(mobileClean);
      await p2pTransfer.mutateAsync({
        recipientMobileHash,
        amount: BigInt(Math.round(amt * 100)),
      });
      setSuccess(true);
      toast.success("Transfer successful!");
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("not registered")) {
        toast.error("Yeh mobile number registered nahi hai");
      } else if (msg.includes("self")) {
        toast.error("Apne aap ko transfer nahi kar sakte");
      } else {
        toast.error("Transfer failed. Dobara try karein.");
      }
    }
  };

  if (success) {
    return (
      <div className="min-h-full bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto" />
          <h2 className="text-xl font-bold text-foreground">
            Transfer Successful!
          </h2>
          <p className="text-muted-foreground text-sm">
            Funds have been sent successfully.
          </p>
          <Button
            onClick={onBack}
            className="bg-primary hover:bg-primary/90 text-white rounded-xl btn-glow"
          >
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full animate-slide-in">
      {showMpinModal && (
        <MPinModal
          title="Confirm PIN for Transfer"
          onSuccess={handlePinSuccess}
          onClose={() => setShowMpinModal(false)}
        />
      )}

      <header className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border sticky top-0 z-10">
        <button
          type="button"
          data-ocid="p2p.back.button"
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-foreground">Pay User</h1>
      </header>

      <div className="flex-1 px-4 py-4 space-y-4">
        <div className="flex flex-col items-center gap-2 py-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center">
            <ArrowLeftRight className="w-8 h-8 text-primary" />
          </div>
          <p className="text-muted-foreground text-sm text-center">
            Registered mobile number se kisi bhi user ko pay karein
          </p>
        </div>

        <div className="bg-card border border-primary/30 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Available Balance</p>
          <p className="text-2xl font-bold text-foreground">
            {balance !== undefined ? formatRupees(balance) : "₹0.00"}
          </p>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipientMobile" className="text-foreground">
              Recipient Mobile Number
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="recipientMobile"
                data-ocid="p2p.input"
                type="tel"
                inputMode="numeric"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                maxLength={10}
                placeholder="10-digit mobile number"
                className="pl-10 bg-card border-border text-foreground h-12"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Recipient ka woh mobile number jo unhone register karte waqt diya
              tha
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="p2pAmount" className="text-foreground">
              Amount (₹)
            </Label>
            <Input
              id="p2pAmount"
              data-ocid="p2p.amount.input"
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount in rupees"
              className="bg-card border-border text-foreground h-12"
            />
          </div>

          <Button
            data-ocid="p2p.submit_button"
            type="submit"
            disabled={p2pTransfer.isPending}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl btn-glow"
          >
            {p2pTransfer.isPending ? "Sending..." : "Pay User"}
          </Button>
        </form>
      </div>
    </div>
  );
}
