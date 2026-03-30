import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, MessageCircle, Send, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useGetChatMessages,
  useGetChatQueueStatus,
  useJoinChatQueue,
  useLeaveChatQueue,
  useSendChatMessage,
} from "../hooks/useQueries";

interface LiveChatScreenProps {
  onBack: () => void;
}

export default function LiveChatScreen({ onBack }: LiveChatScreenProps) {
  const [step, setStep] = useState<"input" | "chat">("input");
  const [mobileNumber, setMobileNumber] = useState("");
  const [messageText, setMessageText] = useState("");
  const [joined, setJoined] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const joinQueue = useJoinChatQueue();
  const leaveQueue = useLeaveChatQueue();
  const sendMessage = useSendChatMessage();

  const { data: queueStatus, refetch: refetchStatus } =
    useGetChatQueueStatus(joined);
  const { data: messages = [], refetch: refetchMessages } = useGetChatMessages(
    joined && !!queueStatus?.isActive,
  );

  const isActive = queueStatus?.isActive ?? false;
  const position = Number(queueStatus?.position ?? 0);
  const queueLength = Number(queueStatus?.queueLength ?? 0);

  // Auto-scroll messages
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // When user becomes active (from waiting), refresh messages
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    if (isActive) {
      refetchMessages();
    }
  }, [isActive]);

  const handleJoin = async () => {
    if (mobileNumber.length !== 10 || !/^[0-9]+$/.test(mobileNumber)) {
      toast.error("10-digit mobile number daalen.");
      return;
    }
    try {
      await joinQueue.mutateAsync(mobileNumber);
      setJoined(true);
      setStep("chat");
      await refetchStatus();
    } catch {
      toast.error("Queue join nahi hua. Dobara try karein.");
    }
  };

  const handleLeave = async () => {
    try {
      await leaveQueue.mutateAsync();
    } catch {
      // ignore
    }
    setJoined(false);
    setStep("input");
    setMobileNumber("");
    setMessageText("");
    onBack();
  };

  const handleSend = async () => {
    const text = messageText.trim();
    if (!text) return;
    try {
      await sendMessage.mutateAsync(text);
      setMessageText("");
      await refetchMessages();
    } catch {
      toast.error("Message send nahi hua.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col min-h-full animate-slide-in">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border sticky top-0 z-10">
        <button
          type="button"
          data-ocid="livechat.back.button"
          onClick={handleLeave}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #1e3a5f, #2563eb)" }}
          >
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-foreground text-sm">
              Live Chat Support
            </h1>
            {joined && (
              <p className="text-xs text-muted-foreground">
                {isActive ? (
                  <span className="text-emerald-400 font-medium">● Active</span>
                ) : (
                  <span className="text-amber-400 font-medium">
                    ⏳ Queue #{position}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col px-4 py-4">
        <AnimatePresence mode="wait">
          {/* Step 1: Mobile number input */}
          {step === "input" && (
            <motion.div
              key="input-step"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col items-center justify-center gap-6"
            >
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #0f1e4a, #1a3a7a)",
                  boxShadow: "0 0 30px rgba(37,99,235,0.4)",
                }}
              >
                <MessageCircle className="w-9 h-9 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold text-foreground">
                  Live Chat Support
                </h2>
                <p className="text-sm text-muted-foreground">
                  Admin se seedha baat karo. Apna registered mobile number
                  daalen.
                </p>
              </div>
              <div
                className="w-full bg-card border border-primary/30 rounded-2xl p-5 space-y-4"
                style={{ boxShadow: "0 0 16px rgba(37,99,235,0.15)" }}
                data-ocid="livechat.form.card"
              >
                <div className="space-y-2">
                  <label
                    className="text-sm font-semibold text-foreground"
                    htmlFor="mobile-input"
                  >
                    Registered Mobile Number
                  </label>
                  <Input
                    id="mobile-input"
                    data-ocid="livechat.mobile.input"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={mobileNumber}
                    onChange={(e) =>
                      setMobileNumber(e.target.value.replace(/\D/g, ""))
                    }
                    className="bg-muted border-border h-12 text-center text-lg font-mono tracking-widest"
                  />
                </div>
                <Button
                  data-ocid="livechat.join.button"
                  onClick={handleJoin}
                  disabled={joinQueue.isPending || mobileNumber.length !== 10}
                  className="w-full h-12 font-bold rounded-xl"
                  style={{ boxShadow: "0 0 20px rgba(37,99,235,0.5)" }}
                >
                  {joinQueue.isPending
                    ? "Join kar raha hai..."
                    : "Chat Shuru Karo 💬"}
                </Button>
              </div>
              <div className="flex items-center gap-2 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl w-full">
                <Users className="w-4 h-4 text-amber-400 shrink-0" />
                <p className="text-xs text-amber-400">
                  Agar admin busy hoga toh aapko queue mein wait karna padega.
                  Number dikhega.
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 2: Chat or Waiting */}
          {step === "chat" && (
            <motion.div
              key="chat-step"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col gap-4"
            >
              {!isActive ? (
                /* Waiting in queue */
                <div className="flex-1 flex flex-col items-center justify-center gap-6">
                  <div
                    className="w-32 h-32 rounded-full flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, #0f1e4a, #1a3a7a)",
                      boxShadow: "0 0 40px rgba(37,99,235,0.4)",
                    }}
                    data-ocid="livechat.queue.card"
                  >
                    <div className="text-center">
                      <p className="text-4xl font-black text-primary">
                        #{position}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Queue
                      </p>
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <h2 className="text-lg font-bold text-foreground">
                      Aap queue mein{" "}
                      <span className="text-primary">#{position} number</span>{" "}
                      par hain
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Total {queueLength} log queue mein hain. Thoda wait
                      karein.
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                      Jab aapki baari aayegi, chat automatic shuru ho jayegi.
                    </p>
                  </div>
                  <div
                    className="w-full bg-card border border-amber-500/30 rounded-2xl p-4"
                    style={{ boxShadow: "0 0 12px rgba(245,158,11,0.15)" }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <p className="text-sm text-amber-400 font-medium">
                        Queue mein wait kar rahe hain... auto-refresh har 3
                        second.
                      </p>
                    </div>
                  </div>
                  <Button
                    data-ocid="livechat.leave_queue.button"
                    variant="outline"
                    onClick={handleLeave}
                    className="border-destructive/40 text-destructive hover:bg-destructive/10 rounded-xl"
                  >
                    Queue Chhod Do
                  </Button>
                </div>
              ) : (
                /* Active chat */
                <>
                  <div
                    className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 flex items-center gap-3"
                    data-ocid="livechat.active.success_state"
                  >
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <p className="text-sm text-emerald-400 font-medium">
                      Admin se connected! Ab baat kar sakte ho.
                    </p>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 min-h-0">
                    <ScrollArea className="h-[calc(100vh-380px)]">
                      <div ref={scrollRef} className="space-y-3 pr-2">
                        {messages.length === 0 && (
                          <div
                            className="text-center py-8 text-muted-foreground text-sm"
                            data-ocid="livechat.messages.empty_state"
                          >
                            Chat shuru karo! Koi bhi sawaal pucho.
                          </div>
                        )}
                        {messages.map((msg: any) => (
                          <motion.div
                            key={String(msg.id)}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${
                              msg.senderIsAdmin
                                ? "justify-start"
                                : "justify-end"
                            }`}
                          >
                            <div
                              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                                msg.senderIsAdmin
                                  ? "bg-card border border-border text-foreground rounded-tl-sm"
                                  : "bg-primary text-white rounded-tr-sm"
                              }`}
                              style={
                                !msg.senderIsAdmin
                                  ? {
                                      boxShadow: "0 0 10px rgba(37,99,235,0.4)",
                                    }
                                  : undefined
                              }
                            >
                              {msg.senderIsAdmin && (
                                <p className="text-xs text-primary font-semibold mb-1">
                                  Support Agent
                                </p>
                              )}
                              <p>{msg.text}</p>
                              <p
                                className={`text-xs mt-1 ${
                                  msg.senderIsAdmin
                                    ? "text-muted-foreground"
                                    : "text-white/60"
                                }`}
                              >
                                {new Date(
                                  Number(msg.timestamp) / 1_000_000,
                                ).toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Message input */}
                  <div className="flex gap-2">
                    <Input
                      data-ocid="livechat.message.input"
                      placeholder="Message likhein..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="flex-1 bg-muted border-border h-11"
                    />
                    <Button
                      data-ocid="livechat.send.button"
                      onClick={handleSend}
                      disabled={!messageText.trim() || sendMessage.isPending}
                      className="h-11 w-11 p-0 rounded-xl"
                      style={{ boxShadow: "0 0 14px rgba(37,99,235,0.5)" }}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>

                  <Button
                    data-ocid="livechat.end_chat.button"
                    variant="outline"
                    onClick={handleLeave}
                    className="border-destructive/40 text-destructive hover:bg-destructive/10 rounded-xl text-sm"
                  >
                    Chat Khatam Karo ✕
                  </Button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
