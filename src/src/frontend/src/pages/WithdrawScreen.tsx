import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import MPinModal from "../components/MPinModal";
import { useBalance, useSubmitWithdrawal } from "../hooks/useQueries";
import { formatRupees } from "../utils/format";

interface WithdrawScreenProps {
  onBack: () => void;
}

export default function WithdrawScreen({ onBack }: WithdrawScreenProps) {
  const [amount, setAmount] = useState("");
  const [upiDetails, setUpiDetails] = useState("");
  const [success, setSuccess] = useState(false);
  const [showMpinModal, setShowMpinModal] = useState(false);
  const { data: balance } = useBalance();
  const submitWithdrawal = useSubmitWithdrawal();

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number.parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (balance !== undefined && BigInt(Math.round(amt * 100)) > balance) {
      toast.error("Insufficient balance");
      return;
    }
    if (!upiDetails.trim()) {
      toast.error("Enter your UPI/Bank details");
      return;
    }
    setShowMpinModal(true);
  };

  const handlePinSuccess = async () => {
    setShowMpinModal(false);
    const amt = Number.parseFloat(amount);
    try {
      await submitWithdrawal.mutateAsync({
        amount: BigInt(Math.round(amt * 100)),
        upiDetails: upiDetails.trim(),
      });
      setSuccess(true);
      toast.success("Withdrawal request submitted!");
    } catch {
      toast.error("Failed to submit withdrawal");
    }
  };

  if (success) {
    return (
      <div className="min-h-full bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto" />
          <h2 className="text-xl font-bold text-foreground">
            Request Submitted!
          </h2>
          <p className="text-muted-foreground text-sm">
            Your withdrawal is pending admin approval. Amount will be
            transferred shortly.
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
          title="Confirm PIN for Withdrawal"
          onSuccess={handlePinSuccess}
          onClose={() => setShowMpinModal(false)}
        />
      )}

      <header className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border sticky top-0 z-10">
        <button
          type="button"
          data-ocid="withdraw.back.button"
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-foreground">Withdraw Funds</h1>
      </header>

      <div className="flex-1 px-4 py-4 space-y-4">
        <div className="bg-card border border-primary/30 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Available Balance</p>
          <p className="text-2xl font-bold text-foreground">
            {balance !== undefined ? formatRupees(balance) : "₹0.00"}
          </p>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="withdrawAmount" className="text-foreground">
              Amount (₹)
            </Label>
            <Input
              id="withdrawAmount"
              data-ocid="withdraw.input"
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount in rupees"
              className="bg-card border-border text-foreground h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="upiDetails" className="text-foreground">
              UPI ID / Bank Details
            </Label>
            <Textarea
              id="upiDetails"
              data-ocid="withdraw.textarea"
              value={upiDetails}
              onChange={(e) => setUpiDetails(e.target.value)}
              placeholder="Enter your UPI ID or bank account details"
              className="bg-card border-border text-foreground min-h-[80px]"
            />
          </div>

          <Button
            data-ocid="withdraw.submit_button"
            type="submit"
            disabled={submitWithdrawal.isPending}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl btn-glow"
          >
            {submitWithdrawal.isPending
              ? "Submitting..."
              : "Submit Withdrawal Request"}
          </Button>
        </form>
      </div>
    </div>
  );
}
