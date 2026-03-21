import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, MessageSquare } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuthContext } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ChatMessageWithUser {
  id: string;
  eventId: string;
  userId: string;
  content: string;
  createdAt: string;
  senderName: string;
  senderRole: string;
  isOrganizer: boolean;
}

interface ChatViewProps {
  eventId: string;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ChatView({ eventId }: ChatViewProps) {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: messages = [], isLoading } = useQuery<ChatMessageWithUser[]>({
    queryKey: ["/api/chat/event", eventId],
    queryFn: async () => {
      const res = await fetch(`/api/chat/event/${eventId}`, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to load chat" }));
        throw new Error(err.error ?? "Failed to load chat");
      }
      return res.json();
    },
    refetchInterval: 3000,
    staleTime: 0,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      apiRequest("POST", `/api/chat/event/${eventId}`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/event", eventId] });
      setMessage("");
      textareaRef.current?.focus();
    },
    onError: (err: any) => {
      toast({ title: "Failed to send message", description: err.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
            <MessageSquare className="h-8 w-8 opacity-40" />
            <p className="text-sm">No messages yet. Say something!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.userId === user?.id;
            const isOrganizer = msg.isOrganizer;
            return (
              <div
                key={msg.id}
                data-testid={`chat-message-${msg.id}`}
                className={cn(
                  "flex gap-2 items-end",
                  isOwn ? "flex-row-reverse" : "flex-row"
                )}
              >
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="text-xs bg-muted">
                    {getInitials(msg.senderName)}
                  </AvatarFallback>
                </Avatar>

                <div
                  className={cn(
                    "flex flex-col max-w-[70%]",
                    isOwn ? "items-end" : "items-start"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center gap-1.5 mb-0.5",
                      isOwn ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <span className="text-xs font-medium text-muted-foreground">
                      {isOwn ? "You" : msg.senderName}
                    </span>
                    {isOrganizer && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1 py-0">
                        Organizer
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground/60">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>

                  <div
                    className={cn(
                      "rounded-2xl px-3 py-2 text-sm leading-relaxed",
                      isOwn
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t p-3">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            data-testid="input-chat-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send)"
            className="resize-none text-sm min-h-[38px] max-h-[120px]"
            rows={1}
          />
          <Button
            size="icon"
            data-testid="button-send-chat"
            onClick={handleSend}
            disabled={!message.trim() || sendMutation.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
