import { ArrowLeftRight, Clock, Home, User, Users } from "lucide-react";
import type { Screen } from "../App";

interface BottomNavProps {
  current: Screen;
  onNavigate: (screen: Screen) => void;
}

const navItems = [
  { id: "home" as Screen, icon: Home, label: "Home" },
  { id: "p2p" as Screen, icon: Users, label: "User Pay" },
  { id: "transactions" as Screen, icon: Clock, label: "History" },
  { id: "profile" as Screen, icon: User, label: "Profile" },
];

export default function BottomNav({ current, onNavigate }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-card border-t border-border z-20">
      <div className="flex items-center justify-around px-2 py-2 relative">
        {navItems.slice(0, 2).map((item) => (
          <NavButton
            key={item.id}
            item={item}
            active={current === item.id}
            onNavigate={onNavigate}
          />
        ))}

        {/* Center FAB */}
        <button
          type="button"
          data-ocid="nav.p2p.button"
          onClick={() => onNavigate("p2p")}
          className="w-14 h-14 -mt-6 rounded-2xl bg-primary flex items-center justify-center shadow-blue hover:bg-primary/90 transition-all btn-glow"
        >
          <ArrowLeftRight className="w-6 h-6 text-white" />
        </button>

        {navItems.slice(2).map((item) => (
          <NavButton
            key={item.id}
            item={item}
            active={current === item.id}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </nav>
  );
}

function NavButton({
  item,
  active,
  onNavigate,
}: {
  item: (typeof navItems)[0];
  active: boolean;
  onNavigate: (s: Screen) => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      data-ocid={`nav.${item.id}.link`}
      onClick={() => onNavigate(item.id)}
      className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-colors ${
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-xs font-medium">{item.label}</span>
    </button>
  );
}
