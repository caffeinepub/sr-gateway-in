import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu, MessageSquare } from "lucide-react";
import { useEffect, useRef } from "react";
import { useCallerProfile, useUnreadMessageCount } from "../hooks/useQueries";

interface HeaderProps {
  onMenuClick?: () => void;
  onProfileClick?: () => void;
  onMessageClick?: () => void;
}

export default function Header({
  onMenuClick,
  onProfileClick,
  onMessageClick,
}: HeaderProps) {
  const { data: profile } = useCallerProfile();
  const { data: unreadCount } = useUnreadMessageCount();
  const initials = profile?.displayName?.slice(0, 2).toUpperCase() || "SR";
  const unread = Number(unreadCount ?? 0n);
  const prevUnreadRef = useRef<number>(unread);

  useEffect(() => {
    if (unread > prevUnreadRef.current) {
      // New message arrived -- play voice notification
      try {
        const utterance = new SpeechSynthesisUtterance(
          "Naya message aaya hai, please check kariye",
        );
        utterance.lang = "hi-IN";
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        window.speechSynthesis.speak(utterance);
      } catch (_e) {
        // Speech not supported, silently ignore
      }
    }
    prevUnreadRef.current = unread;
  }, [unread]);

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-card border-b border-border sticky top-0 z-10">
      <button
        type="button"
        data-ocid="nav.toggle"
        onClick={onMenuClick}
        className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-2">
        {/* App icon */}
        <div
          className="rounded-full p-[2px] flex-shrink-0"
          style={{
            background:
              "linear-gradient(135deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3, #54a0ff)",
            boxShadow:
              "0 0 12px rgba(99,102,241,0.9), 0 0 24px rgba(139,92,246,0.5)",
          }}
        >
          <img
            src="/assets/uploads/1774820779356-019d3bad-1b16-715a-b984-8a8cd89db061-1.png"
            alt="SR GATEWAY IN"
            className="w-8 h-8 rounded-full object-cover"
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-primary font-bold text-lg tracking-wide">
            SR
          </span>
          <span className="text-foreground font-bold text-lg tracking-wide">
            GATEWAY
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          data-ocid="messages.open_modal_button"
          onClick={onMessageClick}
          className="relative w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-[3px] shadow-lg">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
        <button
          type="button"
          data-ocid="nav.profile.link"
          onClick={onProfileClick}
        >
          <Avatar className="w-9 h-9 border border-primary/40">
            <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </div>
    </header>
  );
}
