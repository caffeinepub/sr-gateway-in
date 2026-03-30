import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import BottomNav from "./components/BottomNav";
import MPinModal from "./components/MPinModal";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import {
  useCallerProfile,
  useGetMpinStatus,
  useSaveProfile,
  useSetMpin,
  useSetUserCredentials,
} from "./hooks/useQueries";
import AddFundsScreen from "./pages/AddFundsScreen";
import AdminPanel from "./pages/AdminPanel";
import HomeScreen from "./pages/HomeScreen";
import LoginScreen from "./pages/LoginScreen";
import MyApiScreen from "./pages/MyApiScreen";
import P2PScreen from "./pages/P2PScreen";
import ProfileScreen from "./pages/ProfileScreen";
import type { RegisterData } from "./pages/RegisterScreen";
import RegisterScreen from "./pages/RegisterScreen";
import SetupProfile from "./pages/SetupProfile";
import TransactionsScreen from "./pages/TransactionsScreen";
import WithdrawScreen from "./pages/WithdrawScreen";

const ADMIN_HASH = "#srgw-admin-9x7k";

export type Screen =
  | "home"
  | "addFunds"
  | "withdraw"
  | "p2p"
  | "transactions"
  | "profile"
  | "myapi";

// ─── Admin App ────────────────────────────────────────────────────────────────
function AdminApp() {
  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-[430px] relative flex flex-col min-h-screen">
        <header className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border sticky top-0 z-10">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{
              background:
                "linear-gradient(135deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3, #54a0ff)",
            }}
          >
            SR
          </div>
          <h1 className="font-bold text-foreground text-sm">
            SR GATEWAY IN — Admin
          </h1>
        </header>
        <main className="flex-1 overflow-y-auto">
          <AdminPanel onBack={() => {}} />
        </main>
      </div>
      <Toaster />
    </div>
  );
}

// ─── User App ─────────────────────────────────────────────────────────────────
function UserApp() {
  const { identity, isInitializing, clear } = useInternetIdentity();
  const { actor } = useActor();
  const { data: profile, isLoading: profileLoading } = useCallerProfile();
  const { data: mpinStatus, isLoading: mpinLoading } = useGetMpinStatus();
  const [screen, setScreen] = useState<Screen>("home");
  const [mpinSessionVerified, setMpinSessionVerified] = useState(false);

  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [pendingRegistration, setPendingRegistration] =
    useState<RegisterData | null>(null);
  const [registrationSaving, setRegistrationSaving] = useState(false);
  const [registrationError, setRegistrationError] = useState("");

  const { mutateAsync: saveProfileFn } = useSaveProfile();
  const { mutateAsync: setCredsFn } = useSetUserCredentials();
  const { mutateAsync: setMpinFn } = useSetMpin();

  const [pendingCreds, setPendingCreds] = useState<{
    mobileHash: string;
    passwordHash: string;
  } | null>(null);
  const [credentialsVerified, setCredentialsVerified] = useState(false);
  const [credentialError, setCredentialError] = useState("");
  const [verifyingCreds, setVerifyingCreds] = useState(false);

  // After II login + pendingRegistration: save new user data
  useEffect(() => {
    if (!identity || !actor || !pendingRegistration || registrationSaving)
      return;
    if (profile) {
      setPendingRegistration(null);
      return;
    }
    setRegistrationSaving(true);
    const reg = pendingRegistration;
    (async () => {
      try {
        // Check for duplicate mobile number before saving
        const alreadyRegistered = await actor.isMobileHashRegistered(
          reg.mobileHash,
        );
        if (alreadyRegistered) {
          setRegistrationError("DUPLICATE_MOBILE");
          setPendingRegistration(null);
          setRegistrationSaving(false);
          return;
        }
        await saveProfileFn({ displayName: reg.name, balance: BigInt(0) });
        await Promise.all([
          setCredsFn({
            mobileHash: reg.mobileHash,
            passwordHash: reg.passwordHash,
          }),
          setMpinFn(reg.mpinHash),
        ]);
        setRegistrationError("");
      } catch (err: unknown) {
        const errMsg = String(err);
        if (errMsg.includes("DUPLICATE_MOBILE")) {
          setRegistrationError("DUPLICATE_MOBILE");
        }
        // fallback to SetupProfile
      } finally {
        setPendingRegistration(null);
        setRegistrationSaving(false);
      }
    })();
  }, [
    identity,
    actor,
    pendingRegistration,
    profile,
    registrationSaving,
    saveProfileFn,
    setCredsFn,
    setMpinFn,
  ]);

  // After II login (non-registration), verify stored credentials
  useEffect(() => {
    if (
      !identity ||
      !actor ||
      !pendingCreds ||
      credentialsVerified ||
      verifyingCreds ||
      pendingRegistration
    )
      return;

    setVerifyingCreds(true);
    setCredentialError("");

    (actor as any)
      .verifyUserCredentials(pendingCreds.mobileHash, pendingCreds.passwordHash)
      .then((ok: boolean) => {
        if (ok) {
          setCredentialsVerified(true);
        } else {
          clear();
          setPendingCreds(null);
          setCredentialError(
            "Mobile number ya password galat hai. Dobara try karein.",
          );
        }
      })
      .catch(() => {
        setCredentialsVerified(true);
      })
      .finally(() => {
        setVerifyingCreds(false);
      });
  }, [
    identity,
    actor,
    pendingCreds,
    credentialsVerified,
    verifyingCreds,
    clear,
    pendingRegistration,
  ]);

  const loading = identity && (profileLoading || mpinLoading);

  if (isInitializing || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">SR</span>
          </div>
          <p className="text-muted-foreground text-sm animate-pulse">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!identity) {
    if (authMode === "register") {
      return (
        <>
          <RegisterScreen
            onLoginClick={() => {
              setAuthMode("login");
              setRegistrationError("");
            }}
            onRegisterReady={(data) => {
              setRegistrationError("");
              setPendingRegistration(data);
            }}
            registrationError={registrationError}
          />
          <Toaster />
        </>
      );
    }
    return (
      <>
        <LoginScreen
          onCredentialsReady={(mobileHash, passwordHash) => {
            setPendingCreds({ mobileHash, passwordHash });
            setCredentialsVerified(false);
            setCredentialError("");
          }}
          credentialError={credentialError}
          onRegister={() => setAuthMode("register")}
        />
        <Toaster />
      </>
    );
  }

  if (registrationSaving) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
          </div>
          <p className="text-muted-foreground text-sm">
            Account create ho raha hai...
          </p>
        </div>
      </div>
    );
  }

  if (!profile) {
    if (mpinStatus?.isSet || mpinLoading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
            </div>
            <p className="text-muted-foreground text-sm">
              Profile load ho raha hai...
            </p>
          </div>
        </div>
      );
    }
    return (
      <>
        <SetupProfile />
        <Toaster />
      </>
    );
  }

  if (pendingCreds && !credentialsVerified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
          </div>
          <p className="text-muted-foreground text-sm">
            Credentials verify ho rahe hain...
          </p>
        </div>
      </div>
    );
  }

  if (mpinStatus?.isSet && !mpinSessionVerified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">SR</span>
          </div>
          <p className="text-muted-foreground text-sm">
            Enter your PIN to continue
          </p>
        </div>
        <MPinModal
          title="Enter MPIN to Continue"
          onSuccess={() => setMpinSessionVerified(true)}
          onClose={() => {}}
        />
        <Toaster />
      </div>
    );
  }

  // ─── USER PANEL ────────────────────────────────────────────────────────────
  const mainScreens: Screen[] = ["home", "p2p", "transactions", "profile"];

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-[430px] relative flex flex-col min-h-screen">
        <main className="flex-1 pb-20 overflow-y-auto">
          {screen === "home" && <HomeScreen onNavigate={setScreen} />}
          {screen === "addFunds" && (
            <AddFundsScreen onBack={() => setScreen("home")} />
          )}
          {screen === "withdraw" && (
            <WithdrawScreen onBack={() => setScreen("home")} />
          )}
          {screen === "p2p" && <P2PScreen onBack={() => setScreen("home")} />}
          {screen === "transactions" && <TransactionsScreen />}
          {screen === "profile" && <ProfileScreen onNavigate={setScreen} />}
          {screen === "myapi" && (
            <MyApiScreen onBack={() => setScreen("profile")} />
          )}
        </main>
        {mainScreens.includes(screen) && (
          <BottomNav current={screen} onNavigate={setScreen} />
        )}
      </div>
      <Toaster />
    </div>
  );
}

// ─── App Router ───────────────────────────────────────────────────────────────
export default function App() {
  const isAdminRoute = window.location.hash === ADMIN_HASH;
  if (isAdminRoute) return <AdminApp />;
  return <UserApp />;
}
