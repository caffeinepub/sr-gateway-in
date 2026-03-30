import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Download,
  Key,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import MPinModal from "../components/MPinModal";
import { useBlobStorage } from "../hooks/useBlobStorage";
import {
  useApiConfig,
  useSubmitApiActivationRequest,
  useUserApiData,
} from "../hooks/useQueries";
import { formatRupees } from "../utils/format";

interface MyApiScreenProps {
  onBack: () => void;
}

export default function MyApiScreen({ onBack }: MyApiScreenProps) {
  const { data: apiData, isLoading } = useUserApiData();
  const { data: apiConfig } = useApiConfig();
  const submitRequest = useSubmitApiActivationRequest();
  const { uploadBlob, getBlobUrl } = useBlobStorage();

  const [showActivationFlow, setShowActivationFlow] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showMpinModal, setShowMpinModal] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const canisterId = window.location.hostname.split(".")[0] || "<canister-id>";
  const apiEndpoint = `https://${canisterId}.icp0.io/api?token={TOKEN}&amount={AMT}&number={NUM}`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionId.trim()) {
      toast.error("Enter Transaction ID");
      return;
    }
    if (!proofFile) {
      toast.error("Upload payment screenshot");
      return;
    }
    setShowMpinModal(true);
  };

  const handlePinSuccess = async () => {
    setShowMpinModal(false);
    try {
      setUploading(true);
      const blobId = await uploadBlob(proofFile!);
      await submitRequest.mutateAsync({ proofBlobId: blobId, transactionId });
      setSubmitted(true);
      toast.success("Activation request submitted!");
    } catch {
      toast.error("Failed to submit request");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full animate-slide-in">
      {/* Lightbox */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxImg(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setLightboxImg(null);
          }}
          aria-modal="true"
        >
          <img
            src={lightboxImg}
            alt="Guide"
            className="max-w-full max-h-full rounded-xl object-contain"
          />
          <button
            type="button"
            className="absolute top-4 right-4 text-white"
            onClick={() => setLightboxImg(null)}
          >
            <X className="w-8 h-8" />
          </button>
        </div>
      )}

      {showMpinModal && (
        <MPinModal
          title="Confirm PIN for API Activation"
          onSuccess={handlePinSuccess}
          onClose={() => setShowMpinModal(false)}
        />
      )}

      <header className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border sticky top-0 z-10">
        <button
          type="button"
          data-ocid="myapi.back.button"
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-foreground">My API</h1>
        <div className="ml-auto">
          {isLoading ? (
            <Skeleton className="w-16 h-6 rounded-full" />
          ) : apiData?.isActive ? (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
              Active
            </Badge>
          ) : (
            <Badge className="bg-rose-500/20 text-rose-400 border-0">
              Inactive
            </Badge>
          )}
        </div>
      </header>

      <div className="flex-1 px-4 py-4 space-y-4">
        {isLoading ? (
          <div data-ocid="myapi.loading_state" className="space-y-3">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        ) : apiData?.isActive ? (
          <ActiveApiView
            token={apiData.token || ""}
            apiEndpoint={apiEndpoint}
            copyToClipboard={copyToClipboard}
          />
        ) : submitted ? (
          <div
            data-ocid="myapi.success_state"
            className="flex flex-col items-center justify-center py-12 gap-4"
          >
            <CheckCircle2 className="w-16 h-16 text-emerald-400" />
            <div className="text-center">
              <h2 className="text-lg font-bold text-foreground">
                Request Submitted!
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Admin will review and activate your API. You'll get your token
                after approval.
              </p>
            </div>
          </div>
        ) : showActivationFlow ? (
          <ActivationFlow
            apiConfig={apiConfig}
            transactionId={transactionId}
            setTransactionId={setTransactionId}
            proofFile={proofFile}
            setProofFile={setProofFile}
            uploading={uploading}
            onSubmit={handleSubmitForm}
            onBack={() => setShowActivationFlow(false)}
            getBlobUrl={getBlobUrl}
            onOpenLightbox={setLightboxImg}
          />
        ) : (
          <InactiveView
            activationRequests={apiData?.activationRequests || []}
            onActivate={() => setShowActivationFlow(true)}
          />
        )}
      </div>
    </div>
  );
}

function ActiveApiView({
  token,
  apiEndpoint,
  copyToClipboard,
}: {
  token: string;
  apiEndpoint: string;
  copyToClipboard: (text: string, label: string) => void;
}) {
  const fullEndpoint = apiEndpoint.replace("{TOKEN}", token);

  return (
    <div className="space-y-4" data-ocid="myapi.panel">
      <div className="bg-card border border-emerald-500/30 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-emerald-400" />
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
            Your API Token
          </p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <code className="text-foreground font-mono text-sm bg-muted px-3 py-2 rounded-xl flex-1 overflow-x-auto">
            {token}
          </code>
          <button
            type="button"
            data-ocid="myapi.token.button"
            onClick={() => copyToClipboard(token, "API Token")}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-primary flex-shrink-0"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-card border border-primary/30 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">
            API Endpoint
          </p>
        </div>
        <div className="bg-muted rounded-xl p-3">
          <code className="text-foreground font-mono text-xs break-all">
            {fullEndpoint}
          </code>
        </div>
        <button
          type="button"
          data-ocid="myapi.endpoint.button"
          onClick={() => copyToClipboard(fullEndpoint, "API Endpoint")}
          className="flex items-center gap-2 text-primary text-sm"
        >
          <Copy className="w-4 h-4" /> Copy Endpoint
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          How to Use
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="text-primary font-bold">1.</span>
            Replace <code className="text-primary">{"{{AMT}}"}</code> with
            payment amount
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-bold">2.</span>
            Replace <code className="text-primary">{"{{NUM}}"}</code> with
            recipient number
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-bold">3.</span>
            GET request triggers auto payment from your wallet
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-bold">⚠️</span>
            Keep your token secret — never share it!
          </li>
        </ul>
      </div>
    </div>
  );
}

function InactiveView({
  activationRequests,
  onActivate,
}: {
  activationRequests: any[];
  onActivate: () => void;
}) {
  return (
    <div className="space-y-4">
      <div
        className="bg-card border border-border rounded-2xl p-5 space-y-3"
        data-ocid="myapi.card"
      >
        <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
          <Zap className="w-6 h-6 text-primary" />
        </div>
        <h2 className="font-bold text-foreground">API Payment Gateway</h2>
        <p className="text-muted-foreground text-sm">
          Activate your API service to enable automated payments. Once active,
          you can trigger wallet deductions via a simple API call.
        </p>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>✅ Automated wallet deductions</li>
          <li>✅ Unique API token per user</li>
          <li>✅ Full transaction history</li>
          <li>✅ One-time activation fee</li>
        </ul>
        <Button
          data-ocid="myapi.primary_button"
          onClick={onActivate}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl"
        >
          Activate API Service
        </Button>
      </div>

      {activationRequests.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Request History
          </p>
          {activationRequests.map((req, idx) => (
            <div
              key={req.transactionId || idx}
              data-ocid={`myapi.item.${idx + 1}`}
              className="bg-card border border-border rounded-2xl p-3 flex items-center justify-between"
            >
              <p className="text-sm text-muted-foreground">
                Tx:{" "}
                <span className="font-mono text-foreground">
                  {req.transactionId}
                </span>
              </p>
              {req.status.__kind__ === "pending" && (
                <Badge className="bg-amber-500/20 text-amber-400 border-0 text-xs">
                  Pending
                </Badge>
              )}
              {req.status.__kind__ === "approved" && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-xs">
                  Approved
                </Badge>
              )}
              {req.status.__kind__ === "rejected" && (
                <Badge className="bg-rose-500/20 text-rose-400 border-0 text-xs">
                  Rejected
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Step 1 screenshot removed as per user instruction
const guideSteps = [
  {
    src: "/assets/uploads/1774805703155-019d3aad-c59b-7122-a566-8dc62dbd36a4-2.png",
    label: "Step 2: UPI se fee pay karein aur screenshot lo",
  },
  {
    src: "/assets/uploads/1774805786610-019d3aad-c95e-77a8-8097-092cbaec1827-3.png",
    label: "Step 3: Admin approve karega, API token milega",
  },
];

function ActivationFlow({
  apiConfig,
  transactionId,
  setTransactionId,
  proofFile,
  setProofFile,
  uploading,
  onSubmit,
  onBack,
  getBlobUrl,
  onOpenLightbox,
}: {
  apiConfig: any;
  transactionId: string;
  setTransactionId: (v: string) => void;
  proofFile: File | null;
  setProofFile: (f: File | null) => void;
  uploading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  getBlobUrl: (id: string) => string;
  onOpenLightbox: (src: string) => void;
}) {
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Step-by-Step Guide - full width stacked */}
      <div className="bg-card border border-primary/20 rounded-2xl p-4 space-y-4">
        <p className="text-xs font-semibold text-primary uppercase tracking-wide text-center">
          📋 API Activate Karne Ki Guide (Step by Step)
        </p>
        {guideSteps.map((step, i) => (
          <div key={step.src} className="space-y-2">
            <button
              type="button"
              onClick={() => onOpenLightbox(step.src)}
              className="w-full relative rounded-xl overflow-hidden border-2 border-primary/40 cursor-zoom-in"
            >
              <img
                src={step.src}
                alt={`Step ${i + 1}`}
                className="w-full object-cover"
              />
              <span className="absolute top-2 left-2 bg-primary text-white text-sm font-bold rounded-full w-7 h-7 flex items-center justify-center">
                {i + 1}
              </span>
            </button>
            <p className="text-sm text-muted-foreground text-center">
              {step.label}
            </p>
          </div>
        ))}
        <p className="text-xs text-center text-muted-foreground bg-muted rounded-lg py-2 px-3">
          Neeche UPI se payment karein → Screenshot upload karein → Admin
          approve karega → API active!
        </p>
      </div>

      {/* API Payment Details */}
      {apiConfig && (
        <div
          className="bg-card border border-primary/30 rounded-2xl p-4 space-y-3"
          data-ocid="myapi.card"
        >
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">
            Pay Activation Fee
          </p>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">
              Activation Fee
            </span>
            <span className="font-bold text-foreground text-lg">
              {formatRupees(apiConfig.activationFee)}
            </span>
          </div>
          {apiConfig.merchantUpiId && (
            <div className="bg-muted rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">UPI ID</p>
                <p className="text-foreground font-medium">
                  {apiConfig.merchantUpiId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(apiConfig.merchantUpiId);
                  toast.success("UPI ID copied!");
                }}
                className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-primary"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          )}
          {apiConfig.paymentMobileNumber && (
            <div className="bg-muted rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Payment Number</p>
                <p className="text-foreground font-medium">
                  {apiConfig.paymentMobileNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(apiConfig.paymentMobileNumber);
                  toast.success("Number copied!");
                }}
                className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-primary"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          )}
          {apiConfig.qrCodeBlobId && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Scan QR Code</p>
              <img
                src={getBlobUrl(apiConfig.qrCodeBlobId)}
                alt="API Payment QR"
                className="w-48 h-48 object-contain rounded-xl border-2 border-primary/30 bg-white p-2"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = getBlobUrl(apiConfig.qrCodeBlobId);
                  link.download = "api-payment-qr.png";
                  link.click();
                }}
                className="flex items-center gap-2 text-primary text-sm mt-2"
              >
                <Download className="w-4 h-4" /> QR Download Karein
              </button>
            </div>
          )}
        </div>
      )}

      {/* Submit Form */}
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="txId" className="text-foreground">
            Transaction ID
          </Label>
          <Input
            id="txId"
            data-ocid="myapi.input"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            placeholder="Enter payment transaction ID"
            className="bg-card border-border text-foreground h-12"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">Payment Screenshot</Label>
          <label
            data-ocid="myapi.dropzone"
            className="flex flex-col items-center gap-2 border-2 border-dashed border-border rounded-2xl p-6 cursor-pointer hover:border-primary/50 transition-colors"
          >
            <Upload className="w-8 h-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {proofFile ? proofFile.name : "Tap to upload screenshot"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setProofFile(e.target.files?.[0] || null)}
            />
          </label>
        </div>

        <Button
          data-ocid="myapi.submit_button"
          type="submit"
          disabled={uploading}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl"
        >
          {uploading ? "Uploading..." : "Submit Activation Request"}
        </Button>
      </form>
    </div>
  );
}
