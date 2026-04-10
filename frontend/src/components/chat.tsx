"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Loader2, MessageSquare, ArrowLeft, User } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { format, isToday, isYesterday } from "date-fns";

function formatMessageTime(date: Date) {
  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return `Yesterday ${format(date, "h:mm a")}`;
  return format(date, "MMM d, h:mm a");
}

// ── Conversation List ──
interface ConversationListProps {
  onSelect: (conv: any) => void;
  role: string;
}

export function ConversationList({ onSelect, role }: ConversationListProps) {
  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => apiClient.get("/messaging/conversations").then(r => r.data),
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!conversations?.length) {
    return (
      <div className="card text-center py-12">
        <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">No messages yet</p>
        <p className="text-slate-400 text-sm mt-1">
          {role === "DOCTOR"
            ? "Your conversations with patients will appear here."
            : "Message your doctor directly from your appointment history."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map((conv: any) => {
        const other = role === "DOCTOR"
          ? conv.patientProfile?.user?.fullName
          : conv.doctorProfile?.user?.fullName;
        const lastMsg = conv.messages?.[0];
        const unread = conv.messages?.filter((m: any) => !m.readAt && m.sender?.id !== conv.currentUserId).length ?? 0;

        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv)}
            className="w-full text-left card p-4 hover:border-brand-200 hover:bg-brand-50/30 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center shrink-0 font-bold text-brand-600">
                {other?.charAt(0) ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-900 text-sm truncate">
                    {role === "DOCTOR" ? other : `Dr. ${other}`}
                  </p>
                  {lastMsg && (
                    <p className="text-xs text-slate-400 shrink-0 ml-2">
                      {formatMessageTime(new Date(lastMsg.createdAt))}
                    </p>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {lastMsg ? lastMsg.body : "No messages yet"}
                </p>
              </div>
              {unread > 0 && (
                <span className="w-5 h-5 bg-brand-600 text-white text-xs rounded-full flex items-center justify-center shrink-0">
                  {unread}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Chat Window ──
interface ChatWindowProps {
  conversationId: string;
  otherName: string;
  onBack: () => void;
}

export function ChatWindow({ conversationId, otherName, onBack }: ChatWindowProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: conversation, isLoading } = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () => apiClient.get(`/messaging/conversations/${conversationId}/messages`).then(r => r.data),
    refetchInterval: 3000,
  });

  const sendMutation = useMutation({
    mutationFn: (body: string) =>
      apiClient.post(`/messaging/conversations/${conversationId}/messages`, { body }),
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (err: any) => alert(err.response?.data?.message || "Failed to send message."),
  });

  const handleSend = useCallback(() => {
    const trimmed = message.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
  }, [message, sendMutation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages]);

  const messages = conversation?.messages ?? [];

  return (
    <div className="flex flex-col h-[600px] card p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-white">
        <button onClick={onBack} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center font-bold text-brand-600 text-sm">
          {otherName?.charAt(0) ?? "?"}
        </div>
        <div>
          <p className="font-semibold text-slate-900 text-sm">{otherName}</p>
          <p className="text-xs text-green-500">Active</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <MessageSquare className="w-10 h-10 text-slate-300" />
            <p className="text-slate-400 text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((msg: any, idx: number) => {
              const isMe = msg.sender?.id === user?.id;
              const showDate = idx === 0 ||
                new Date(msg.createdAt).toDateString() !== new Date(messages[idx - 1].createdAt).toDateString();

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex items-center gap-2 my-3">
                      <div className="flex-1 h-px bg-slate-200" />
                      <p className="text-xs text-slate-400 shrink-0">
                        {isToday(new Date(msg.createdAt)) ? "Today" :
                         isYesterday(new Date(msg.createdAt)) ? "Yesterday" :
                         format(new Date(msg.createdAt), "MMM d, yyyy")}
                      </p>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>
                  )}
                  <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                        isMe
                          ? "bg-brand-600 text-white rounded-br-sm"
                          : "bg-white text-slate-800 border border-slate-100 rounded-bl-sm shadow-sm"
                      }`}>
                        {msg.body}
                      </div>
                      <div className="flex items-center gap-1">
                        <p className="text-xs text-slate-400">
                          {formatMessageTime(new Date(msg.createdAt))}
                        </p>
                        {isMe && msg.readAt && (
                          <span className="text-xs text-brand-400">✓✓</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-slate-100 bg-white">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="input flex-1 text-sm"
            disabled={sendMutation.isPending}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || sendMutation.isPending}
            className="w-10 h-10 flex items-center justify-center bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors shrink-0"
          >
            {sendMutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Chat Panel — used in both dashboards ──
interface ChatPanelProps {
  role: "DOCTOR" | "PATIENT";
}

export function ChatPanel({ role }: ChatPanelProps) {
  const [selectedConv, setSelectedConv] = useState<any>(null);

  const otherName = selectedConv
    ? role === "DOCTOR"
      ? selectedConv.patientProfile?.user?.fullName
      : `Dr. ${selectedConv.doctorProfile?.user?.fullName}`
    : "";

  return (
    <div>
      {selectedConv ? (
        <ChatWindow
          conversationId={selectedConv.id}
          otherName={otherName}
          onBack={() => setSelectedConv(null)}
        />
      ) : (
        <ConversationList onSelect={setSelectedConv} role={role} />
      )}
    </div>
  );
}

// ── Start Chat Button — used from appointment cards ──
interface StartChatButtonProps {
  otherProfileId: string;
  role: "DOCTOR" | "PATIENT";
  label?: string;
}

export function StartChatButton({ otherProfileId, role, label }: StartChatButtonProps) {
  const queryClient = useQueryClient();
  const [conv, setConv] = useState<any>(null);

  const startMutation = useMutation({
    mutationFn: () => apiClient.post(`/messaging/conversations/${otherProfileId}`),
    onSuccess: (res) => {
      setConv(res.data);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (err: any) => alert(err.response?.data?.message || "Failed to start conversation."),
  });

  if (conv) {
    return (
      <ChatWindow
        conversationId={conv.id}
        otherName={label ?? "Chat"}
        onBack={() => setConv(null)}
      />
    );
  }

  return (
    <button
      onClick={() => startMutation.mutate()}
      disabled={startMutation.isPending}
      className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-2 rounded-lg touch-manipulation disabled:opacity-50"
    >
      {startMutation.isPending
        ? <Loader2 className="w-3 h-3 animate-spin" />
        : <MessageSquare className="w-3 h-3" />
      }
      {label ?? "Message"}
    </button>
  );
}