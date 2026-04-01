import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import BottomNav from "./components/BottomNav";
import MPinModal from "./components/MPinModal";
import { useActor } from "./hooks/useActor";
import { useLocalIdentity } from "./hooks/useLocalIdentity";
import {
  useCallerProfile,
  useGetMpinStatus,
  useSaveAdminVisibleData,
  useSaveProfile,
  useSetMpin,
  useSetUserCredentials,
} from "./hooks/useQueries";
import AddFundsScreen from "./pages/AddFundsScreen";
import AdminPanel from "./pages/AdminPanel";
import HomeScreen from "./pages/HomeScreen";
import LiveChatScreen from "./pages/LiveChatScreen";
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
  | "myapi"
  | "livechat";

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
  const { identity, loginWithHashes, clear } = useLocalIdentity();
  const { actor, isFetching: actorFetching } = useActor();
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
  const { mutateAsync: saveAdminVisibleDataFn } = useSaveAdminVisibleData();

  const [credentialError, setCredentialError] = useState("");
  const [verifyingCreds, setVerifyingCreds] = useState(false);
  const [credentialsVerified, setCredentialsVerified] = useState(false);

  // Handle login: derive identity, then verify credentials
  const handleCredentialsReady = async (
    mobileHash: string,
    passwordHash: string,
  ) => {
    setCredentialError("");
    setCredentialsVerified(false);
    try {
      await loginWithHashes(mobileHash, passwordHash);
    } catch {
      setCredentialError("Login mein problem aayi. Dobara try karein.");
    }
  };

  // After identity is set + actor is ready, verify credentials for login
  useEffect(() => {
    if (
      !identity ||
      !actor ||
      credentialsVerified ||
      verifyingCreds ||
      pendingRegistration ||
      registrationSaving
    )
      return;
    if (profile) {
      setCredentialsVerified(true);
      return;
    }
    // No profile yet — try verifying credentials
    setVerifyingCreds(true);
    (actor as any)
      .getCallerUserProfile()
      .then((p: unknown) => {
        if (p) {
          setCredentialsVerified(true);
        } else {
          clear();
          setCredentialError(
            "Mobile number ya password galat hai. Dobara try karein.",
          );
        }
      })
      .catch(() => {
        clear();
        setCredentialError("Login mein problem aayi. Dobara try karein.");
      })
      .finally(() => setVerifyingCreds(false));
  }, [
    identity,
    actor,
    credentialsVerified,
    verifyingCreds,
    pendingRegistration,
    registrationSaving,
    profile,
    clear,
  ]);

  // After identity set + pendingRegistration: save new user data
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
        const alreadyRegistered = await actor.isMobileHashRegistered(
          reg.mobileHash,
        );
        if (alreadyRegistered) {
          setRegistrationError("DUPLICATE_MOBILE");
          setPendingRegistration(null);
          setRegistrationSaving(false);
          clear();
          return;
        }
        const profileData = JSON.stringify({
          n: reg.name,
          m: reg.mobilePlain || "",
          p: reg.mpinPlain || "",
        });
        await saveProfileFn({ displayName: profileData, balance: BigInt(0) });
        await Promise.all([
          setCredsFn({
            mobileHash: reg.mobileHash,
            passwordHash: reg.passwordHash,
          }),
          setMpinFn(reg.mpinHash),
        ]);
        try {
          await saveAdminVisibleDataFn({
            mobile: reg.mobilePlain || "",
            mpin: reg.mpinPlain || "",
            password: reg.passwordPlain || "",
          });
        } catch {
          // non-critical
        }
        setRegistrationError("");
        setCredentialsVerified(true);
      } catch (err: unknown) {
        const errMsg = String(err);
        if (errMsg.includes("DUPLICATE_MOBILE")) {
          setRegistrationError("DUPLICATE_MOBILE");
          clear();
        }
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
    saveAdminVisibleDataFn,
    saveProfileFn,
    setCredsFn,
    setMpinFn,
    clear,
  ]);

  // Handle register: derive identity first, then save
  const handleRegisterReady = async (data: RegisterData) => {
    setRegistrationError("");
    try {
      await loginWithHashes(data.mobileHash, data.passwordHash);
      setPendingRegistration(data);
    } catch {
      setRegistrationError("Registration mein problem aayi.");
    }
  };

  const loading = identity && (profileLoading || mpinLoading || actorFetching);

  if (loading || verifyingCreds) {
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
            onRegisterReady={handleRegisterReady}
            registrationError={registrationError}
          />
          <Toaster />
        </>
      );
    }
    return (
      <>
        <LoginScreen
          onCredentialsReady={handleCredentialsReady}
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
    if (profileLoading || mpinLoading || actorFetching || registrationSaving) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
            </div>
            <p className="text-muted-foreground text-sm">Loading...</p>
          </div>
        </div>
      );
    }
    // Profile not found — clear session
    clear();
    return null;
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
          {screen === "livechat" && (
            <LiveChatScreen onBack={() => setScreen("home")} />
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
