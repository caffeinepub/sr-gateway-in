import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MessageSquare } from "lucide-react";
import { useEffect } from "react";
import { useGetMessages, useMarkAllMessagesRead } from "../hooks/useQueries";

interface MessagePanelProps {
  open: boolean;
  onClose: () => void;
}

function formatTime(timestamp: bigint | number): string {
  const ms =
    typeof timestamp === "bigint" ? Number(timestamp) / 1_000_000 : timestamp;
  const d = new Date(ms);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Abhi";
  if (diffMins < 60) return `${diffMins} min pehle`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs} ghante pehle`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function MessagePanel({ open, onClose }: MessagePanelProps) {
  const { data: messages = [] } = useGetMessages();
  const markRead = useMarkAllMessagesRead();

  const markReadMutate = markRead.mutate;
  useEffect(() => {
    if (open) {
      markReadMutate();
    }
  }, [open, markReadMutate]);

  const sorted = [...messages].sort((a, b) => {
    const ta =
      typeof a.timestamp === "bigint" ? Number(a.timestamp) : a.timestamp;
    const tb =
      typeof b.timestamp === "bigint" ? Number(b.timestamp) : b.timestamp;
    return tb - ta;
  });

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        data-ocid="messages.panel"
        className="rounded-t-2xl bg-card border-t border-border h-[70vh] p-0 flex flex-col"
      >
        <SheetHeader className="px-4 py-4 border-b border-border flex-shrink-0">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <MessageSquare className="w-5 h-5 text-primary" />
            Messages
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4 py-3">
          {sorted.length === 0 ? (
            <div
              data-ocid="messages.empty_state"
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <MessageSquare className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">
                Koi message nahi hai abhi
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sorted.map((msg: any, i: number) => (
                <div
                  key={msg.id ?? i}
                  data-ocid={`messages.item.${i + 1}`}
                  className="flex gap-3 p-3 rounded-xl bg-muted/50 border border-border"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-lg flex-shrink-0">
                    {msg.isGlobal ? "🌐" : "👤"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-primary">
                        {msg.isGlobal ? "Global" : "Personal"}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed break-words">
                      {msg.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
