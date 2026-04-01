import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import jsQR from "jsqr";
import {
  ArrowLeft,
  CheckCircle,
  Copy,
  Download,
  ImageIcon,
  Loader2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import MPinModal from "../components/MPinModal";
import { useBlobStorage } from "../hooks/useBlobStorage";
import { usePaymentSettings, useSubmitDeposit } from "../hooks/useQueries";

interface AddFundsScreenProps {
  onBack: () => void;
}

const decodeQRFromImage = (file: File): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      URL.revokeObjectURL(url);
      resolve(code ? code.data : null);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
};

export default function AddFundsScreen({ onBack }: AddFundsScreenProps) {
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showMpinModal, setShowMpinModal] = useState(false);

  // Gallery QR state
  const [qrDecoding, setQrDecoding] = useState(false);
  const [qrResult, setQrResult] = useState<string | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const { data: settings } = usePaymentSettings();
  const submitDeposit = useSubmitDeposit();
  const { uploadBlob, getBlobUrl } = useBlobStorage();

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number.parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!file) {
      toast.error("Upload payment screenshot");
      return;
    }
    setShowMpinModal(true);
  };

  const handlePinSuccess = async () => {
    setShowMpinModal(false);
    const amt = Number.parseFloat(amount);
    try {
      setUploading(true);
      const blobId = await uploadBlob(file!);
      await submitDeposit.mutateAsync({
        amount: BigInt(Math.round(amt * 100)),
        blobId,
      });
      setSuccess(true);
      toast.success("Deposit request submitted!");
    } catch {
      toast.error("Failed to submit deposit");
    } finally {
      setUploading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const handleGalleryQrPick = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setQrResult(null);
    setQrDecoding(true);
    try {
      const result = await decodeQRFromImage(picked);
      if (result) {
        setQrResult(result);
      } else {
        toast.error("QR Code nahi mila, dobara try karein");
      }
    } catch {
      toast.error("QR Code nahi mila, dobara try karein");
    } finally {
      setQrDecoding(false);
      // reset so same file can be picked again
      if (galleryInputRef.current) galleryInputRef.current.value = "";
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
            Your deposit is pending admin approval. It will be credited after
            verification.
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
          title="Confirm PIN for Deposit"
          onSuccess={handlePinSuccess}
          onClose={() => setShowMpinModal(false)}
        />
      )}

      <header className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border sticky top-0 z-10">
        <button
          type="button"
          data-ocid="deposit.back.button"
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-foreground">Add Funds</h1>
      </header>

      <div className="flex-1 px-4 py-4 space-y-4">
        {settings && (
          <div
            className="bg-card border border-primary/30 rounded-2xl p-4 space-y-3"
            data-ocid="deposit.card"
          >
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">
              Payment Details
            </p>

            {/* PhonePe */}
            {settings.phonePeNumber && (
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-purple-400">
                      Pe
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">PhonePe</p>
                    <p className="text-foreground font-medium text-sm">
                      {settings.phonePeNumber}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  data-ocid="deposit.phonepe.button"
                  onClick={() =>
                    copyToClipboard(settings.phonePeNumber, "PhonePe number")
                  }
                  className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-primary"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Paytm */}
            {settings.paytmNumber && (
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-sky-400">Pt</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Paytm</p>
                    <p className="text-foreground font-medium text-sm">
                      {settings.paytmNumber}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  data-ocid="deposit.paytm.button"
                  onClick={() =>
                    copyToClipboard(settings.paytmNumber, "Paytm number")
                  }
                  className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-primary"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Google Pay */}
            {settings.googlePayNumber && (
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-green-400">G</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Google Pay</p>
                    <p className="text-foreground font-medium text-sm">
                      {settings.googlePayNumber}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  data-ocid="deposit.gpay.button"
                  onClick={() =>
                    copyToClipboard(
                      settings.googlePayNumber,
                      "Google Pay number",
                    )
                  }
                  className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-primary"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* UPI ID */}
            {settings.upiId && (
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-xs text-muted-foreground">UPI ID</p>
                  <p className="text-foreground font-medium">
                    {settings.upiId}
                  </p>
                </div>
                <button
                  type="button"
                  data-ocid="deposit.upi.button"
                  onClick={() => copyToClipboard(settings.upiId, "UPI ID")}
                  className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-primary"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            )}

            {settings.qrCodeBlobId && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Scan QR Code
                </p>
                <div className="relative inline-block">
                  <img
                    src={getBlobUrl(settings.qrCodeBlobId)}
                    alt="Payment QR"
                    className="w-44 h-44 object-contain rounded-xl border-2 border-primary/30"
                    style={{
                      boxShadow:
                        "0 0 16px rgba(99,102,241,0.4), 0 0 32px rgba(99,102,241,0.15)",
                    }}
                  />
                </div>
                <button
                  type="button"
                  data-ocid="deposit.qr.download_button"
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = getBlobUrl(settings.qrCodeBlobId);
                    link.download = "payment-qr.png";
                    link.click();
                  }}
                  className="flex items-center gap-2 text-primary text-sm mt-2 hover:text-primary/80 transition-colors"
                >
                  <Download className="w-4 h-4" /> QR Code Download Karein
                </button>
              </div>
            )}
          </div>
        )}

        {/* Gallery QR Upload Section */}
        <div
          className="bg-card border border-emerald-500/30 rounded-2xl p-4 space-y-3"
          data-ocid="deposit.gallery_qr.panel"
          style={{
            boxShadow:
              "0 0 18px rgba(16,185,129,0.12), 0 0 6px rgba(16,185,129,0.08)",
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-sm font-semibold text-emerald-400">
              Gallery se QR Code Scan Karein
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Apni gallery se koi bhi QR code image upload karein — UPI ID ya
            payment info automatically decode ho jayegi.
          </p>

          {/* Hidden file input */}
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            data-ocid="deposit.gallery_qr.upload_button"
            onChange={handleGalleryQrPick}
          />

          <Button
            type="button"
            disabled={qrDecoding}
            onClick={() => galleryInputRef.current?.click()}
            className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl flex items-center gap-2 justify-center transition-all"
            style={{
              boxShadow: qrDecoding
                ? "none"
                : "0 0 12px rgba(16,185,129,0.45), 0 0 24px rgba(16,185,129,0.2)",
            }}
            data-ocid="deposit.gallery_qr.button"
          >
            {qrDecoding ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                QR Decode ho raha hai...
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4" />
                Gallery se QR Upload karein
              </>
            )}
          </Button>

          {/* Decoded result */}
          {qrResult && (
            <div
              className="mt-2 rounded-xl bg-emerald-950/40 border border-emerald-500/40 p-3 space-y-2"
              data-ocid="deposit.gallery_qr.success_state"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-semibold text-emerald-400">
                  QR Successfully Decoded!
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-foreground break-all leading-relaxed flex-1">
                  {qrResult}
                </p>
                <button
                  type="button"
                  data-ocid="deposit.gallery_qr.copy_button"
                  onClick={() => copyToClipboard(qrResult, "QR Code data")}
                  className="w-8 h-8 shrink-0 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-foreground">
              Amount (₹)
            </Label>
            <Input
              id="amount"
              data-ocid="deposit.input"
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
            <Label className="text-foreground">Payment Screenshot</Label>
            <label
              data-ocid="deposit.dropzone"
              className="flex flex-col items-center gap-2 border-2 border-dashed border-border rounded-2xl p-6 cursor-pointer hover:border-primary/50 transition-colors"
            >
              <Upload className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {file ? file.name : "Tap to upload screenshot"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          <Button
            data-ocid="deposit.submit_button"
            type="submit"
            disabled={uploading || submitDeposit.isPending}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl btn-glow"
          >
            {uploading
              ? "Uploading..."
              : submitDeposit.isPending
                ? "Submitting..."
                : "Submit Deposit Request"}
          </Button>
        </form>
      </div>
    </div>
  );
}
