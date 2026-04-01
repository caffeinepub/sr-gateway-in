import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, Mail, Phone, Shield, User } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

async function hashString(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

const PIN_KEYS = ["p0", "p1", "p2", "p3"];
const EMPTY_PIN: string[] = ["", "", "", ""];

export interface RegisterData {
  name: string;
  mobilePlain: string;
  mpinPlain: string;
  passwordPlain: string;
  mobileHash: string;
  passwordHash: string;
  mpinHash: string;
}

interface RegisterScreenProps {
  onLoginClick?: () => void;
  onRegisterReady?: (data: RegisterData) => void;
  registrationError?: string;
}

export default function RegisterScreen({
  onLoginClick,
  onRegisterReady,
  registrationError,
}: RegisterScreenProps) {
  const [step, setStep] = useState<1 | 2>(1);

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step1Error, setStep1Error] = useState("");

  const [pin, setPin] = useState<string[]>([...EMPTY_PIN]);
  const [confirmPin, setConfirmPin] = useState<string[]>([...EMPTY_PIN]);
  const [pinError, setPinError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pinRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);
  const confirmRefs = useRef<(HTMLInputElement | null)[]>([
    null,
    null,
    null,
    null,
  ]);

  useEffect(() => {
    if (step === 2) pinRefs.current[0]?.focus();
  }, [step]);

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setStep1Error("");
    if (!name.trim()) {
      setStep1Error("Naam zaroori hai.");
      return;
    }
    const mobileClean = mobile.replace(/\D/g, "");
    if (mobileClean.length < 10) {
      setStep1Error("Valid 10-digit mobile number daalen.");
      return;
    }
    if (password.length < 8) {
      setStep1Error("Password kam se kam 8 characters ka hona chahiye.");
      return;
    }
    if (password !== confirmPassword) {
      setStep1Error("Passwords match nahi kar rahe.");
      return;
    }
    setStep(2);
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

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError("");
    const p = pin.join("");
    const cp = confirmPin.join("");
    if (p.length !== 4) {
      setPinError("4-digit PIN zaroori hai.");
      return;
    }
    if (p !== cp) {
      setPinError("PINs match nahi kar rahe. Dobara try karein.");
      setConfirmPin([...EMPTY_PIN]);
      confirmRefs.current[0]?.focus();
      return;
    }
    setIsSubmitting(true);
    try {
      const mobileClean = mobile.replace(/\D/g, "");
      const [mobileHash, passwordHash, mpinHash] = await Promise.all([
        hashString(mobileClean),
        hashString(password),
        hashString(p),
      ]);
      // Store mobile in localStorage for profile display
      localStorage.setItem("sr_user_mobile", mobileClean);
      onRegisterReady?.({
        name: name.trim(),
        mobilePlain: mobileClean,
        passwordPlain: password,
        mpinPlain: p,
        mobileHash,
        passwordHash,
        mpinHash,
      });
    } catch {
      setPinError("Registration mein problem aayi. Dobara try karein.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isSubmitting;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-primary/8 blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-sm flex flex-col items-center gap-6"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="relative">
            <div
              className="rounded-3xl p-[3px]"
              style={{
                background:
                  "linear-gradient(135deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3, #54a0ff, #ff6b6b)",
                boxShadow:
                  "0 0 25px rgba(99,102,241,0.8), 0 0 50px rgba(139,92,246,0.5)",
              }}
            >
              <img
                src="/assets/uploads/1774820779356-019d3bad-1b16-715a-b984-8a8cd89db061-1.png"
                alt="SR GATEWAY IN"
                className="w-24 h-24 rounded-2xl object-cover"
              />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground tracking-wide">
              SR GATEWAY IN
            </h1>
            <p className="text-muted-foreground text-xs mt-0.5 font-medium">
              SR TECHNOLOGY LTD™
            </p>
          </div>
        </motion.div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-1.5 rounded-full transition-colors ${step >= 1 ? "bg-primary" : "bg-border"}`}
          />
          <div
            className={`w-8 h-1.5 rounded-full transition-colors ${step >= 2 ? "bg-primary" : "bg-border"}`}
          />
        </div>

        {/* Duplicate mobile error banner */}
        {registrationError === "DUPLICATE_MOBILE" && (
          <div className="w-full bg-red-900/80 border border-red-500 rounded-xl p-4 text-center shadow-lg">
            <p className="text-red-200 font-bold text-sm">🚫 Account Block!</p>
            <p className="text-red-300 text-xs mt-1">
              Yeh mobile number pehle se registered hai. Duplicate account
              banane ki koshish par account block ho jayega.
            </p>
            <p className="text-red-400 text-xs mt-0.5">
              This mobile number is already registered. Duplicate attempts will
              be blocked.
            </p>
          </div>
        )}

        {/* Security policy notice */}
        <div className="w-full bg-yellow-900/40 border border-yellow-600/50 rounded-xl p-3 text-center">
          <p className="text-yellow-300 text-xs font-semibold">
            ⚠️ Ek Mobile = Ek Account
          </p>
          <p className="text-yellow-400/80 text-xs mt-0.5">
            Ek mobile number se sirf ek account bana sakte hain. Agar doosra
            account banane ki koshish karoge toh account automatically block ho
            jayega.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full bg-card border border-border rounded-2xl p-6 shadow-xl"
            >
              <h2 className="text-lg font-semibold text-foreground mb-1">
                Naya Account Banayein
              </h2>
              <p className="text-muted-foreground text-xs mb-5">
                Step 1 of 2 — Basic details bharein
              </p>

              <form onSubmit={handleStep1} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-name" className="text-foreground text-sm">
                    Display Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reg-name"
                      data-ocid="register.input"
                      type="text"
                      placeholder="Apna naam daalen"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 bg-background border-border text-foreground h-12 rounded-xl"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="reg-mobile"
                    className="text-foreground text-sm"
                  >
                    Mobile Number
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reg-mobile"
                      data-ocid="register.input"
                      type="tel"
                      inputMode="numeric"
                      placeholder="10-digit mobile number"
                      value={mobile}
                      onChange={(e) =>
                        setMobile(e.target.value.replace(/\D/g, ""))
                      }
                      maxLength={10}
                      className="pl-10 bg-background border-border text-foreground h-12 rounded-xl"
                      disabled={isLoading}
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
                      data-ocid="register.input"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 bg-background border-border text-foreground h-12 rounded-xl"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
                    htmlFor="reg-confirm"
                    className="text-foreground text-sm"
                  >
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reg-confirm"
                      data-ocid="register.input"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Password dobara daalen"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10 bg-background border-border text-foreground h-12 rounded-xl"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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

                <AnimatePresence>
                  {step1Error && (
                    <motion.p
                      data-ocid="register.error_state"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-destructive text-xs text-center bg-destructive/10 rounded-lg px-3 py-2"
                    >
                      {step1Error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <Button
                  data-ocid="register.primary_button"
                  type="submit"
                  disabled={
                    isLoading ||
                    !name ||
                    !mobile ||
                    !password ||
                    !confirmPassword
                  }
                  className="w-full h-12 rounded-xl font-bold text-base bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-200 active:scale-[0.98]"
                >
                  Continue →
                </Button>
              </form>

              <div className="mt-5 text-center">
                <p className="text-xs text-muted-foreground">
                  Pehle se account hai?{" "}
                  <button
                    data-ocid="register.link"
                    type="button"
                    onClick={onLoginClick}
                    className="text-primary font-semibold hover:underline"
                  >
                    Login karein
                  </button>
                </p>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="w-full bg-card border border-border rounded-2xl p-6 shadow-xl"
            >
              <h2 className="text-lg font-semibold text-foreground mb-1">
                Security PIN Set Karein 🔐
              </h2>
              <p className="text-muted-foreground text-xs mb-4">
                Step 2 of 2 — Yeh PIN aapke account ki chabi hai
              </p>

              <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 mb-5">
                <p className="text-xs text-primary/80 text-center">
                  🛡️ Login, Deposit, Withdrawal, aur P2P Transfer ke liye isi PIN
                  ka use karein. Isse kisi ke saath share na karein.
                </p>
              </div>

              <form onSubmit={handleComplete} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-foreground text-sm">
                    Set 4-Digit PIN
                  </Label>
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
                        data-ocid={`register.pin.input.${i + 1}`}
                        onChange={(e) =>
                          handleDigit(pin, setPin, pinRefs, i, e.target.value)
                        }
                        onKeyDown={(e) => handleKeyDown(pin, pinRefs, i, e)}
                        className="w-14 h-14 text-center text-2xl font-bold bg-background border-2 border-border rounded-xl text-foreground focus:border-primary focus:outline-none transition-colors"
                        disabled={isLoading}
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
                        data-ocid={`register.confirm_pin.input.${i + 1}`}
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
                        className="w-14 h-14 text-center text-2xl font-bold bg-background border-2 border-border rounded-xl text-foreground focus:border-primary focus:outline-none transition-colors"
                        disabled={isLoading}
                      />
                    ))}
                  </div>
                </div>

                <AnimatePresence>
                  {pinError && (
                    <motion.p
                      data-ocid="register.error_state"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-destructive text-xs text-center bg-destructive/10 rounded-lg px-3 py-2"
                    >
                      {pinError}
                    </motion.p>
                  )}
                </AnimatePresence>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    disabled={isLoading}
                    className="flex-1 h-12 rounded-xl border-border"
                  >
                    Back
                  </Button>
                  <Button
                    data-ocid="register.submit_button"
                    type="submit"
                    disabled={
                      isLoading ||
                      pin.join("").length !== 4 ||
                      confirmPin.join("").length !== 4
                    }
                    className="flex-1 h-12 rounded-xl font-bold bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-200 active:scale-[0.98]"
                  >
                    {isLoading ? "Creating..." : "Complete Registration"}
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Customer Support */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="w-full"
        >
          <button
            type="button"
            onClick={() =>
              window.open(
                "mailto:sk190rihan@gmail.com?subject=Customer Support - SR Gateway IN",
                "_blank",
              )
            }
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-card border border-border text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
          >
            <Mail className="w-4 h-4" />
            Customer Support: sk190rihan@gmail.com
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center gap-2 text-xs text-muted-foreground bg-card border border-border rounded-full px-4 py-2"
        >
          <Shield className="w-3.5 h-3.5 text-primary" />
          <span>Secure Registration — SR TECHNOLOGY LTD™</span>
        </motion.div>
      </motion.div>

      <p className="absolute bottom-6 text-xs text-muted-foreground">
        © {new Date().getFullYear()} Built with ❤️ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          className="text-primary underline"
          target="_blank"
          rel="noreferrer"
        >
          caffeine.ai
        </a>
      </p>
    </div>
  );
}
