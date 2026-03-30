import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, LogOut, Mail, User, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Screen } from "../App";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useCallerProfile,
  useSetMpin,
  useUpdateDisplayName,
  useVerifyMpin,
} from "../hooks/useQueries";

async function hashString(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface ProfileScreenProps {
  onNavigate: (screen: Screen) => void;
}

export default function ProfileScreen({ onNavigate }: ProfileScreenProps) {
  const { clear } = useInternetIdentity();
  const { data: profile } = useCallerProfile();

  const updateName = useUpdateDisplayName();
  const verifyMpin = useVerifyMpin();
  const setMpin = useSetMpin();

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(profile?.displayName || "");

  // MPIN Reset states
  const [mpinResetStep, setMpinResetStep] = useState<
    "idle" | "verify" | "create"
  >("idle");
  const [oldMpin, setOldMpin] = useState("");
  const [newMpin, setNewMpin] = useState("");
  const [confirmNewMpin, setConfirmNewMpin] = useState("");
  const [mpinError, setMpinError] = useState("");
  const [mpinLoading, setMpinLoading] = useState(false);

  const initials = profile?.displayName?.slice(0, 2).toUpperCase() || "SR";
  const mobileNumber = localStorage.getItem("sr_user_mobile") || "";

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    try {
      await updateName.mutateAsync(newName.trim());
      setEditingName(false);
      toast.success("Name updated!");
    } catch {
      toast.error("Failed to update name");
    }
  };

  const handleVerifyOldMpin = async () => {
    if (oldMpin.length !== 4) {
      setMpinError("4-digit MPIN daalen.");
      return;
    }
    setMpinLoading(true);
    setMpinError("");
    try {
      const hash = await hashString(oldMpin);
      const result = await verifyMpin.mutateAsync(hash);
      if (result.success) {
        setMpinResetStep("create");
        setOldMpin("");
      } else {
        const left = Number(result.attemptsLeft);
        setMpinError(`Galat MPIN. ${left} attempts baaki hain.`);
      }
    } catch {
      setMpinError("Verification failed. Dobara try karein.");
    } finally {
      setMpinLoading(false);
    }
  };

  const handleSetNewMpin = async () => {
    if (newMpin.length !== 4) {
      setMpinError("4-digit naya MPIN daalen.");
      return;
    }
    if (newMpin !== confirmNewMpin) {
      setMpinError("PINs match nahi kar rahe.");
      return;
    }
    setMpinLoading(true);
    setMpinError("");
    try {
      const hash = await hashString(newMpin);
      await setMpin.mutateAsync(hash);
      toast.success("MPIN successfully reset!");
      setMpinResetStep("idle");
      setNewMpin("");
      setConfirmNewMpin("");
    } catch {
      setMpinError("MPIN set karne mein problem aayi.");
    } finally {
      setMpinLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full animate-slide-in">
      <header className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border sticky top-0 z-10">
        <User className="w-5 h-5 text-primary" />
        <h1 className="font-bold text-foreground">Profile</h1>
      </header>

      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Profile Hero Banner with multicolor glow frame */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)",
            padding: "2px",
          }}
        >
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              background:
                "linear-gradient(135deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3, #54a0ff, #ff6b6b)",
              borderRadius: "inherit",
            }}
          />
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)",
              boxShadow:
                "0 0 20px rgba(99,102,241,0.5), 0 0 40px rgba(139,92,246,0.3), 0 0 60px rgba(59,130,246,0.2)",
              margin: "2px",
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,107,107,0.08), rgba(254,202,87,0.06), rgba(72,219,251,0.08), rgba(255,159,243,0.06), rgba(84,160,255,0.08))",
              }}
            />
            <div className="relative z-10 p-5 flex items-center gap-4">
              <div
                className="rounded-full p-[2px] flex-shrink-0"
                style={{
                  background:
                    "linear-gradient(135deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3, #54a0ff)",
                  boxShadow: "0 0 15px rgba(139,92,246,0.6)",
                }}
              >
                <Avatar className="w-14 h-14">
                  <AvatarFallback className="bg-[#16213e] text-white text-xl font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div>
                {editingName ? (
                  <div className="flex gap-2">
                    <Input
                      data-ocid="profile.input"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="bg-white/10 border-white/20 text-white h-8 text-sm"
                    />
                    <Button
                      data-ocid="profile.save_button"
                      size="sm"
                      onClick={handleSaveName}
                      disabled={updateName.isPending}
                      className="bg-primary text-white rounded-xl h-8 text-xs"
                    >
                      {updateName.isPending ? "..." : "Save"}
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    data-ocid="profile.edit_button"
                    onClick={() => {
                      setEditingName(true);
                      setNewName(profile?.displayName || "");
                    }}
                  >
                    <p className="font-bold text-white text-lg">
                      {profile?.displayName || "User"}
                    </p>
                    <p className="text-xs text-blue-300/80">Tap to edit name</p>
                  </button>
                )}
                <p className="text-xs text-blue-300/60 mt-1">
                  SR TECHNOLOGY LTD™
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Number */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Aapka Mobile Number
          </Label>
          <p className="text-xs text-blue-400 mb-2">
            Payments send aur receive karne ke liye is mobile number ki zarurat
            padti hai
          </p>
          <div className="flex items-center justify-between gap-2">
            <p className="text-foreground font-mono text-base font-bold flex-1">
              {mobileNumber
                ? `+91 ${mobileNumber}`
                : "Mobile number not available"}
            </p>
            {mobileNumber && (
              <button
                type="button"
                data-ocid="profile.copy.mobile.button"
                onClick={() => {
                  navigator.clipboard.writeText(mobileNumber);
                  toast.success("Mobile number copied!");
                }}
                className="text-primary flex-shrink-0"
              >
                <Copy className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* MPIN Reset */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold text-foreground">
              MPIN Reset
            </Label>
            {mpinResetStep === "idle" && (
              <Button
                data-ocid="profile.mpin_reset.button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setMpinResetStep("verify");
                  setMpinError("");
                }}
                className="border-primary/30 text-primary hover:bg-primary/10 rounded-xl h-8 text-xs"
              >
                Reset MPIN
              </Button>
            )}
          </div>

          {mpinResetStep === "verify" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Pehle apna purana MPIN verify karein
              </p>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="Purana 4-digit MPIN"
                value={oldMpin}
                onChange={(e) => setOldMpin(e.target.value.replace(/\D/g, ""))}
                className="bg-background border-border text-foreground h-10 text-center text-lg tracking-widest"
              />
              {mpinError && (
                <p className="text-destructive text-xs">{mpinError}</p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleVerifyOldMpin}
                  disabled={mpinLoading}
                  className="flex-1 bg-primary text-white rounded-xl h-9"
                >
                  {mpinLoading ? "Verifying..." : "Verify"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setMpinResetStep("idle");
                    setOldMpin("");
                    setMpinError("");
                  }}
                  className="h-9"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {mpinResetStep === "create" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Naya 4-digit MPIN set karein
              </p>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="Naya MPIN"
                value={newMpin}
                onChange={(e) => setNewMpin(e.target.value.replace(/\D/g, ""))}
                className="bg-background border-border text-foreground h-10 text-center text-lg tracking-widest"
              />
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="MPIN confirm karein"
                value={confirmNewMpin}
                onChange={(e) =>
                  setConfirmNewMpin(e.target.value.replace(/\D/g, ""))
                }
                className="bg-background border-border text-foreground h-10 text-center text-lg tracking-widest"
              />
              {mpinError && (
                <p className="text-destructive text-xs">{mpinError}</p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSetNewMpin}
                  disabled={mpinLoading}
                  className="flex-1 bg-primary text-white rounded-xl h-9"
                >
                  {mpinLoading ? "Saving..." : "Set New MPIN"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setMpinResetStep("idle");
                    setNewMpin("");
                    setConfirmNewMpin("");
                    setMpinError("");
                  }}
                  className="h-9"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* My API */}
        <button
          type="button"
          data-ocid="profile.myapi.link"
          onClick={() => onNavigate("myapi")}
          className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-2xl hover:border-primary/30 transition-colors"
          style={{ boxShadow: "0 0 8px rgba(99,102,241,0.2)" }}
        >
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-primary" />
            <span className="font-medium text-foreground">My API</span>
          </div>
          <span className="text-muted-foreground text-xs">&#8250;</span>
        </button>

        {/* Customer Support */}
        <button
          type="button"
          data-ocid="profile.support.button"
          onClick={() =>
            window.open(
              "mailto:sk190rihan@gmail.com?subject=Customer Support - SR Gateway IN",
              "_blank",
            )
          }
          className="w-full flex items-center gap-3 p-4 bg-card border border-border rounded-2xl hover:border-primary/30 transition-colors"
          style={{ boxShadow: "0 0 8px rgba(99,102,241,0.2)" }}
        >
          <Mail className="w-5 h-5 text-primary" />
          <div className="text-left">
            <p className="font-medium text-foreground text-sm">
              Customer Support
            </p>
            <p className="text-xs text-muted-foreground">
              sk190rihan@gmail.com
            </p>
          </div>
        </button>

        {/* Logout */}
        <Button
          data-ocid="profile.logout.button"
          variant="outline"
          onClick={clear}
          className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 rounded-xl"
        >
          <LogOut className="w-4 h-4 mr-2" /> Logout
        </Button>
      </div>
    </div>
  );
}
