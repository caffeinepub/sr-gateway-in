import { Button } from "@/components/ui/button";
import { Lock, ShieldCheck, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  useGetMpinStatus,
  useSetMpin,
  useVerifyMpin,
} from "../hooks/useQueries";

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function msToCountdown(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const PIN_KEYS = ["p0", "p1", "p2", "p3"];

interface PinBoxesProps {
  digits: string[];
  inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  onChange: (index: number, value: string) => void;
  onKeyDown: (index: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  ocidPrefix: string;
}

function PinBoxes({
  digits,
  inputRefs,
  onChange,
  onKeyDown,
  ocidPrefix,
}: PinBoxesProps) {
  return (
    <div className="flex items-center justify-center gap-3">
      {digits.map((d, i) => (
        <input
          key={PIN_KEYS[i]}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={d}
          data-ocid={`${ocidPrefix}.${i + 1}`}
          onChange={(e) => onChange(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          className="w-14 h-14 text-center text-2xl font-bold bg-background border-2 border-border rounded-xl text-foreground focus:border-primary focus:outline-none transition-colors caret-transparent"
        />
      ))}
    </div>
  );
}

interface MPinModalProps {
  title: string;
  onSuccess: () => void;
  onClose: () => void;
}

export default function MPinModal({
  title,
  onSuccess,
  onClose,
}: MPinModalProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", ""]);
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);
  const [lockMs, setLockMs] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [createDigits, setCreateDigits] = useState<string[]>(["", "", "", ""]);
  const [confirmDigits, setConfirmDigits] = useState<string[]>([
    "",
    "",
    "",
    "",
  ]);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([
    null,
    null,
    null,
    null,
  ]);
  const createRefs = useRef<(HTMLInputElement | null)[]>([
    null,
    null,
    null,
    null,
  ]);
  const confirmRefs = useRef<(HTMLInputElement | null)[]>([
    null,
    null,
    null,
    null,
  ]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getMpinStatus = useGetMpinStatus();
  const refetchStatus = getMpinStatus.refetch;
  const verifyMpin = useVerifyMpin();
  const setMpin = useSetMpin();

  const isSet = getMpinStatus.data?.isSet;
  const isLoading = getMpinStatus.isLoading;

  useEffect(() => {
    if (isSet === true) {
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } else if (isSet === false) {
      setTimeout(() => createRefs.current[0]?.focus(), 50);
    }
  }, [isSet]);

  useEffect(() => {
    refetchStatus().then((res) => {
      const status = res.data;
      if (status?.lockedUntil != null) {
        const lockUntilMs = Number(status.lockedUntil) / 1_000_000;
        const remaining = lockUntilMs - Date.now();
        if (remaining > 0) {
          setLocked(true);
          setLockMs(remaining);
        }
      }
    });
  }, [refetchStatus]);

  useEffect(() => {
    if (!locked) return;
    timerRef.current = setInterval(() => {
      setLockMs((prev) => {
        const next = prev - 1000;
        if (next <= 0) {
          clearInterval(timerRef.current!);
          setLocked(false);
          setError("");
          setDigits(["", "", "", ""]);
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [locked]);

  // Verify PIN handlers
  const handleVerifyChange = useCallback((index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < 3) inputRefs.current[index + 1]?.focus();
  }, []);

  const handleVerifyKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !digits[index] && index > 0)
        inputRefs.current[index - 1]?.focus();
    },
    [digits],
  );

  // Create PIN handlers
  const handleCreateChange = useCallback((index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    setCreateDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < 3) createRefs.current[index + 1]?.focus();
  }, []);

  const handleCreateKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !createDigits[index] && index > 0)
        createRefs.current[index - 1]?.focus();
    },
    [createDigits],
  );

  // Confirm PIN handlers
  const handleConfirmChange = useCallback((index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    setConfirmDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < 3) confirmRefs.current[index + 1]?.focus();
  }, []);

  const handleConfirmKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !confirmDigits[index] && index > 0)
        confirmRefs.current[index - 1]?.focus();
    },
    [confirmDigits],
  );

  const handleVerifySubmit = async () => {
    const pin = digits.join("");
    if (pin.length !== 4) {
      setError("Please enter all 4 digits");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const hash = await hashPin(pin);
      const result = await verifyMpin.mutateAsync(hash);
      if (result.success) {
        onSuccess();
      } else if (result.lockedUntil != null) {
        const lockUntilMs = Number(result.lockedUntil) / 1_000_000;
        const remaining = lockUntilMs - Date.now();
        setLocked(true);
        setLockMs(Math.max(remaining, 0));
        setError(
          "3 baar galat PIN! Suraksha ke liye SR GATEWAY IN ne aapka account 30 minute ke liye lock kar diya hai.",
        );
        setDigits(["", "", "", ""]);
      } else {
        const left = Number(result.attemptsLeft);
        setError(
          `Incorrect PIN! ${left} attempt${left !== 1 ? "s" : ""} left.`,
        );
        setDigits(["", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateNext = () => {
    if (createDigits.join("").length !== 4) {
      setError("Pehle 4-digit PIN enter karein");
      return;
    }
    setError("");
    setCreateStep(2);
    setTimeout(() => confirmRefs.current[0]?.focus(), 50);
  };

  const handleSetAndConfirm = async () => {
    const pin = createDigits.join("");
    const confirmPin = confirmDigits.join("");
    if (pin.length !== 4 || confirmPin.length !== 4) {
      setError("Sabhi 4 digits enter karein");
      return;
    }
    if (pin !== confirmPin) {
      setError("PIN match nahi kiya. Dobara try karein.");
      setConfirmDigits(["", "", "", ""]);
      setTimeout(() => confirmRefs.current[0]?.focus(), 50);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const hash = await hashPin(pin);
      await setMpin.mutateAsync(hash);
      onSuccess();
    } catch {
      setError("MPIN set karne mein error aaya. Dobara try karein.");
    } finally {
      setSubmitting(false);
    }
  };

  const verifyPin = digits.join("");

  return (
    <AnimatePresence>
      <motion.div
        key="mpin-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
        data-ocid="mpin.modal"
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 24 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="w-full max-w-sm bg-card border border-primary/30 rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span className="font-bold text-foreground text-base">
                {title}
              </span>
            </div>
            <button
              type="button"
              data-ocid="mpin.close_button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 pb-6 space-y-5">
            {/* Loading */}
            {isLoading && (
              <div
                className="flex flex-col items-center gap-4 py-6"
                data-ocid="mpin.loading_state"
              >
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            )}

            {/* Locked */}
            {!isLoading && locked && (
              <div className="flex flex-col items-center gap-4 py-4">
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2 }}
                >
                  <Lock className="w-16 h-16 text-orange-400" />
                </motion.div>
                <div className="text-center space-y-1">
                  <p className="text-orange-400 font-bold text-sm">
                    {error || "Account Locked"}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Account unlocks in
                  </p>
                </div>
                <div className="bg-muted rounded-2xl px-8 py-3">
                  <span className="text-3xl font-bold text-foreground tabular-nums tracking-widest">
                    {msToCountdown(lockMs)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  PIN entry will be enabled automatically when the timer ends.
                </p>
              </div>
            )}

            {/* MPIN not set - Create flow */}
            {!isLoading && !locked && isSet === false && (
              <>
                <p className="text-xs text-center text-amber-400 bg-amber-500/10 rounded-xl px-3 py-2">
                  ⚠️ Pehle apna 4-digit MPIN set karein, phir payment confirm
                  hogi.
                </p>
                {createStep === 1 && (
                  <>
                    <p className="text-sm font-semibold text-foreground text-center">
                      Naya MPIN Set Karein
                    </p>
                    <p className="text-xs text-muted-foreground text-center">
                      SR GATEWAY IN mein swagat hai! Apna secret 4-digit PIN set
                      karein.
                    </p>
                    <PinBoxes
                      digits={createDigits}
                      inputRefs={createRefs}
                      onChange={handleCreateChange}
                      onKeyDown={handleCreateKeyDown}
                      ocidPrefix="mpin.create.input"
                    />
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-destructive text-xs text-center"
                        data-ocid="mpin.error_state"
                      >
                        {error}
                      </motion.p>
                    )}
                    <Button
                      data-ocid="mpin.submit_button"
                      onClick={handleCreateNext}
                      disabled={createDigits.join("").length !== 4}
                      className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
                    >
                      Next
                    </Button>
                  </>
                )}
                {createStep === 2 && (
                  <>
                    <p className="text-sm font-semibold text-foreground text-center">
                      MPIN Confirm Karein
                    </p>
                    <p className="text-xs text-muted-foreground text-center">
                      Dobara wahi 4-digit PIN daalo confirm karne ke liye.
                    </p>
                    <PinBoxes
                      digits={confirmDigits}
                      inputRefs={confirmRefs}
                      onChange={handleConfirmChange}
                      onKeyDown={handleConfirmKeyDown}
                      ocidPrefix="mpin.confirm.input"
                    />
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-destructive text-xs text-center"
                        data-ocid="mpin.error_state"
                      >
                        {error}
                      </motion.p>
                    )}
                    <Button
                      data-ocid="mpin.submit_button"
                      onClick={handleSetAndConfirm}
                      disabled={
                        confirmDigits.join("").length !== 4 || submitting
                      }
                      className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
                    >
                      {submitting ? "Setting MPIN..." : "Set MPIN & Confirm"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setCreateStep(1);
                        setError("");
                        setConfirmDigits(["", "", "", ""]);
                      }}
                      className="w-full text-xs text-muted-foreground text-center"
                    >
                      ← Pichhe jaao
                    </button>
                  </>
                )}
              </>
            )}

            {/* MPIN is set - Verify flow */}
            {!isLoading && !locked && isSet === true && (
              <>
                <p className="text-xs text-muted-foreground text-center bg-muted/50 rounded-xl px-3 py-2">
                  🔐 Yeh PIN aapke account ki chabi hai. Isse kisi ke saath
                  share na karein.
                </p>
                <PinBoxes
                  digits={digits}
                  inputRefs={inputRefs}
                  onChange={handleVerifyChange}
                  onKeyDown={handleVerifyKeyDown}
                  ocidPrefix="mpin.input"
                />
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-destructive text-xs text-center"
                    data-ocid="mpin.error_state"
                  >
                    {error}
                  </motion.p>
                )}
                <Button
                  data-ocid="mpin.submit_button"
                  onClick={handleVerifySubmit}
                  disabled={verifyPin.length !== 4 || submitting}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
                >
                  {submitting ? "Verifying..." : "Confirm PIN"}
                </Button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
