"use client";

import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
  agentColor?: string;
}

export function ChatMessage({ message, agentColor = "cyan" }: ChatMessageProps) {
  const { role, content, timestamp } = message;
  const isUser = role === "user";

  const colorClasses = {
    cyan: "bg-cyan-500/10 text-cyan-500",
    purple: "bg-purple-500/10 text-purple-500",
    emerald: "bg-emerald-500/10 text-emerald-500",
    amber: "bg-amber-500/10 text-amber-500",
    rose: "bg-rose-500/10 text-rose-500",
    blue: "bg-blue-500/10 text-blue-500",
  };

  return (
    <div
      className={cn(
        "flex gap-4 p-4 rounded-lg transition-colors",
        isUser ? "bg-muted/50" : "bg-background"
      )}
    >
      {/* Avatar */}
      <Avatar className="h-8 w-8 mt-1">
        <AvatarFallback
          className={cn(
            isUser ? "bg-primary text-primary-foreground" : colorClasses[agentColor as keyof typeof colorClasses]
          )}
        >
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 space-y-2 overflow-hidden">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-sm">
            {isUser ? "Tú" : "Asistente"}
          </span>
          <span className="text-xs text-muted-foreground">
            {timestamp.toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* Message content - Por ahora texto plano, luego agregaremos markdown */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {content}
          </p>
        </div>
      </div>
    </div>
  );
}
