"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Send,
  Bot,
  User,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Message = {
  id: string;
  content: string;
  isStaff: boolean;
  isAI: boolean;
  authorId: string | null;
  createdAt: string;
};

type Ticket = {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  aiSuggestion: string | null;
  aiResolved: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  assignedTo: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  messages: Message[];
};

export default function TicketDetailPage({
  params,
}: {
  params: { ticketId: string };
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isAdmin = session?.user?.role === "ADMIN";

  useEffect(() => {
    loadTicket();
    // Polling cada 5 segundos para actualizar mensajes
    const interval = setInterval(loadTicket, 5000);
    return () => clearInterval(interval);
  }, [params.ticketId]);

  useEffect(() => {
    scrollToBottom();
  }, [ticket?.messages]);

  const loadTicket = async () => {
    try {
      const res = await fetch(`/api/support/tickets/${params.ticketId}`);
      if (!res.ok) throw new Error("Failed to fetch ticket");

      const data = await res.json();
      setTicket(data.ticket);
    } catch (error) {
      console.error("Error loading ticket:", error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) return;

    setSending(true);
    try {
      const res = await fetch(`/api/support/tickets/${params.ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message }),
      });

      if (!res.ok) throw new Error("Failed to send message");

      setMessage("");
      await loadTicket();
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Error al enviar el mensaje");
    } finally {
      setSending(false);
    }
  };

  const updateTicketStatus = async (newStatus: string) => {
    if (!isAdmin) return;

    try {
      const res = await fetch("/api/support/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: params.ticketId,
          status: newStatus,
        }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      await loadTicket();
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Error al actualizar el estado");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string; icon: any }> = {
      OPEN: { variant: "default", label: "Abierto", icon: AlertCircle },
      IN_PROGRESS: { variant: "secondary", label: "En Progreso", icon: Clock },
      WAITING_USER: { variant: "outline", label: "Esperando Usuario", icon: Clock },
      RESOLVED: { variant: "default", label: "Resuelto", icon: CheckCircle2 },
      CLOSED: { variant: "secondary", label: "Cerrado", icon: CheckCircle2 },
      CANCELLED: { variant: "destructive", label: "Cancelado", icon: XCircle },
    };

    const config = variants[status] || variants.OPEN;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      BUG: "🐛 Error",
      FEATURE: "✨ Funcionalidad",
      QUESTION: "❓ Pregunta",
      ACCOUNT: "👤 Cuenta",
      BILLING: "💳 Facturación",
      PERFORMANCE: "⚡ Rendimiento",
      OTHER: "📋 Otro",
    };
    return labels[category] || category;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Ticket no encontrado</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/dashboard/support")}
        >
          Volver a Soporte
        </Button>
      </div>
    );
  }

  const canSendMessages = ticket.status !== "CLOSED" && ticket.status !== "CANCELLED";

  return (
    <div className="h-screen flex flex-col p-8 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/support")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{ticket.ticketNumber}</h1>
              {getStatusBadge(ticket.status)}
              {ticket.aiResolved && (
                <Badge variant="outline">
                  <Bot className="h-3 w-3 mr-1" />
                  Resuelto por IA
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">{ticket.title}</p>
          </div>
        </div>
        {isAdmin && canSendMessages && (
          <Select value={ticket.status} onValueChange={updateTicketStatus}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">Abierto</SelectItem>
              <SelectItem value="IN_PROGRESS">En Progreso</SelectItem>
              <SelectItem value="WAITING_USER">Esperando Usuario</SelectItem>
              <SelectItem value="RESOLVED">Resuelto</SelectItem>
              <SelectItem value="CLOSED">Cerrado</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 overflow-hidden">
        {/* Chat Area */}
        <div className="lg:col-span-2 flex flex-col">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="border-b">
              <CardTitle>Conversación</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Mensaje inicial del usuario */}
              <div className="flex gap-3">
                <Avatar>
                  <AvatarImage src={ticket.user.image || undefined} />
                  <AvatarFallback>
                    {ticket.user.name?.[0] || ticket.user.email?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">
                      {ticket.user.name || ticket.user.email}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(ticket.createdAt), "PPp", { locale: es })}
                    </span>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="whitespace-pre-wrap">{ticket.description}</p>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Badge variant="outline">{getCategoryLabel(ticket.category)}</Badge>
                    <Badge className={
                      ticket.priority === "URGENT" ? "bg-red-500" :
                      ticket.priority === "HIGH" ? "bg-orange-500" :
                      ticket.priority === "MEDIUM" ? "bg-blue-500" : "bg-gray-500"
                    }>
                      {ticket.priority}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Mensajes */}
              {ticket.messages.map((msg) => (
                <div key={msg.id} className="flex gap-3">
                  <Avatar>
                    {msg.isAI ? (
                      <AvatarFallback className="bg-primary">
                        <Bot className="h-5 w-5 text-primary-foreground" />
                      </AvatarFallback>
                    ) : msg.isStaff ? (
                      <AvatarFallback className="bg-orange-500">
                        A
                      </AvatarFallback>
                    ) : (
                      <>
                        <AvatarImage src={ticket.user.image || undefined} />
                        <AvatarFallback>
                          {ticket.user.name?.[0] || "U"}
                        </AvatarFallback>
                      </>
                    )}
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">
                        {msg.isAI
                          ? "Asistente IA"
                          : msg.isStaff
                          ? "Soporte"
                          : ticket.user.name || "Usuario"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(msg.createdAt), "PPp", { locale: es })}
                      </span>
                    </div>
                    <div
                      className={`rounded-lg p-3 ${
                        msg.isAI
                          ? "bg-primary/10 border border-primary/20"
                          : msg.isStaff
                          ? "bg-orange-50 dark:bg-orange-950/20"
                          : "bg-muted"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </CardContent>
            {canSendMessages && (
              <div className="border-t p-4">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Textarea
                    placeholder="Escribe tu mensaje..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    disabled={sending}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                  <Button type="submit" disabled={sending || !message.trim()}>
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground mt-2">
                  Presiona Enter para enviar, Shift+Enter para nueva línea
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Usuario:</span>
                <p className="font-medium">{ticket.user.name || ticket.user.email}</p>
              </div>
              {ticket.assignedTo && (
                <div>
                  <span className="text-muted-foreground">Asignado a:</span>
                  <p className="font-medium">
                    {ticket.assignedTo.name || ticket.assignedTo.email}
                  </p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Creado:</span>
                <p className="font-medium">
                  {format(new Date(ticket.createdAt), "PPP", { locale: es })}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Mensajes:</span>
                <p className="font-medium">{ticket.messages.length + 1}</p>
              </div>
            </CardContent>
          </Card>

          {!canSendMessages && (
            <Card className="border-orange-500">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Ticket Cerrado
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <p className="text-muted-foreground">
                  Este ticket ha sido {ticket.status === "CLOSED" ? "cerrado" : "cancelado"}.
                  No se pueden enviar más mensajes.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
