import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, Lock, Mail, Phone, Shield } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

async function hashString(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface LoginScreenProps {
  onCredentialsReady?: (mobileHash: string, passwordHash: string) => void;
  credentialError?: string;
  onRegister?: () => void;
}

export default function LoginScreen({
  onCredentialsReady,
  credentialError,
  onRegister,
}: LoginScreenProps) {
  const { login, isLoggingIn } = useInternetIdentity();
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const mobileClean = mobile.replace(/\D/g, "");
    if (mobileClean.length < 10) {
      setFormError("Valid 10-digit mobile number daalen.");
      return;
    }
    if (password.length < 6) {
      setFormError("Password kam se kam 6 characters ka hona chahiye.");
      return;
    }

    setIsProcessing(true);
    try {
      const [mobileHash, passwordHash] = await Promise.all([
        hashString(mobileClean),
        hashString(password),
      ]);
      // Store mobile in localStorage for profile display
      localStorage.setItem("sr_user_mobile", mobileClean);
      onCredentialsReady?.(mobileHash, passwordHash);
      await login();
    } catch {
      setFormError("Login mein problem aayi. Dobara try karein.");
    } finally {
      setIsProcessing(false);
    }
  };

  const isLoading = isLoggingIn || isProcessing;
  const errorMsg = formError || credentialError;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full bg-primary/8 blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-sm flex flex-col items-center gap-8"
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
                  "0 0 25px rgba(99,102,241,0.8), 0 0 50px rgba(139,92,246,0.5), 0 0 75px rgba(59,130,246,0.3)",
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

        {/* Form card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="w-full bg-card border border-border rounded-2xl p-6 shadow-xl"
        >
          <h2 className="text-lg font-semibold text-foreground mb-1">
            Login karein
          </h2>
          <p className="text-muted-foreground text-xs mb-5">
            Apna mobile number aur password daalen
          </p>

          <form onSubmit={handleContinue} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="mobile" className="text-foreground text-sm">
                Mobile Number
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="mobile"
                  data-ocid="login.input"
                  type="tel"
                  inputMode="numeric"
                  placeholder="10-digit mobile number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                  maxLength={10}
                  className="pl-10 bg-background border-border text-foreground h-12 rounded-xl"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-foreground text-sm">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  data-ocid="login.input"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password daalen"
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

            <AnimatePresence>
              {errorMsg && (
                <motion.p
                  data-ocid="login.error_state"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-destructive text-xs text-center bg-destructive/10 rounded-lg px-3 py-2"
                >
                  {errorMsg}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="relative">
              <motion.div
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{
                  duration: 2.5,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
                className="absolute inset-0 rounded-xl bg-primary/25 blur-md pointer-events-none"
              />
              <Button
                data-ocid="login.primary_button"
                type="submit"
                disabled={isLoading || !mobile || !password}
                className="relative w-full h-12 rounded-xl font-bold text-base bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-200 active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isLoggingIn ? "Connecting..." : "Processing..."}
                  </>
                ) : (
                  "Login"
                )}
              </Button>
            </div>
          </form>

          {/* Password Reset */}
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() =>
                window.open(
                  `mailto:sk190rihan@gmail.com?subject=Password Reset Request&body=Mera registered mobile number: ${mobile || "[apna mobile number yahan likhein]"}`,
                  "_blank",
                )
              }
              className="text-xs text-muted-foreground hover:text-primary transition-colors underline"
            >
              Password bhool gaye? Reset karein
            </button>
          </div>

          {/* Register link */}
          <div className="mt-4 pt-4 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              Naya account?{" "}
              <button
                data-ocid="login.link"
                type="button"
                onClick={onRegister}
                className="text-primary font-semibold hover:underline"
              >
                Register karein →
              </button>
            </p>
          </div>
        </motion.div>

        {/* Customer Support Button */}
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
          <span>Secure Login — SR TECHNOLOGY LTD™</span>
        </motion.div>

        {/* One mobile one account policy notice */}
        <div className="w-full bg-yellow-900/30 border border-yellow-600/40 rounded-xl p-3 text-center">
          <p className="text-yellow-300 text-xs font-semibold">
            ⚠️ Important Security Policy
          </p>
          <p className="text-yellow-400/80 text-xs mt-0.5">
            Ek mobile number se sirf ek account allowed hai. Duplicate account
            banane ki koshish karne par account automatically block ho jayega.
          </p>
        </div>
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
