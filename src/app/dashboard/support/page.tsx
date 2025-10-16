"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LifeBuoy,
  MessageCircle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  Users
} from "lucide-react";

type Ticket = {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  aiResolved: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
  assignedTo: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  messages: Array<{
    id: string;
    content: string;
    createdAt: string;
  }>;
  _count: {
    messages: number;
  };
};

export default function SupportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated") {
      loadTickets();
    }
  }, [status, router, statusFilter]);

  const loadTickets = async () => {
    try {
      const url = statusFilter === "all"
        ? "/api/support/tickets"
        : `/api/support/tickets?status=${statusFilter}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch tickets");

      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (error) {
      console.error("Error loading tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string; icon: any }> = {
      OPEN: { variant: "default", label: "Abierto", icon: AlertCircle },
      IN_PROGRESS: { variant: "secondary", label: "En Progreso", icon: Clock },
      WAITING_USER: { variant: "outline", label: "Esperando Usuario", icon: MessageCircle },
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

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      LOW: "bg-gray-500",
      MEDIUM: "bg-blue-500",
      HIGH: "bg-orange-500",
      URGENT: "bg-red-500",
    };

    return (
      <Badge className={colors[priority] || colors.MEDIUM}>
        {priority}
      </Badge>
    );
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      BUG: "Error",
      FEATURE: "Funcionalidad",
      QUESTION: "Pregunta",
      ACCOUNT: "Cuenta",
      BILLING: "Facturación",
      PERFORMANCE: "Rendimiento",
      OTHER: "Otro",
    };

    return labels[category] || category;
  };

  const openTicket = (ticketId: string) => {
    router.push(`/dashboard/support/${ticketId}`);
  };

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === "OPEN").length,
    inProgress: tickets.filter(t => t.status === "IN_PROGRESS").length,
    resolved: tickets.filter(t => t.status === "RESOLVED" || t.status === "CLOSED").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Cargando...</p>
      </div>
    );
  }

  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <LifeBuoy className="h-8 w-8" />
          {isAdmin ? "Panel de Soporte" : "Mis Tickets"}
        </h1>
        <p className="text-muted-foreground mt-2">
          {isAdmin
            ? "Gestiona todos los tickets de soporte del sistema"
            : "Revisa el estado de tus solicitudes de soporte"}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abiertos</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.open}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resueltos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.resolved}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tickets de Soporte</CardTitle>
              <CardDescription>
                {isAdmin
                  ? "Todos los tickets del sistema"
                  : "Tus solicitudes de soporte"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="OPEN">Abiertos</SelectItem>
                  <SelectItem value="IN_PROGRESS">En Progreso</SelectItem>
                  <SelectItem value="WAITING_USER">Esperando Usuario</SelectItem>
                  <SelectItem value="RESOLVED">Resueltos</SelectItem>
                  <SelectItem value="CLOSED">Cerrados</SelectItem>
                </SelectContent>
              </Select>
              {!isAdmin && (
                <Button onClick={() => router.push("/dashboard/support/new")}>
                  Nuevo Ticket
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="text-center py-12">
              <LifeBuoy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {statusFilter === "all"
                  ? "No hay tickets registrados"
                  : "No hay tickets con este estado"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Estado</TableHead>
                  {isAdmin && <TableHead>Usuario</TableHead>}
                  <TableHead>Mensajes</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-mono text-sm">
                      {ticket.ticketNumber}
                      {ticket.aiResolved && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          IA
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium max-w-xs truncate">
                      {ticket.title}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getCategoryLabel(ticket.category)}
                      </Badge>
                    </TableCell>
                    <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        {ticket.user.name || ticket.user.email}
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-4 w-4" />
                        <span>{ticket._count.messages}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openTicket(ticket.id)}
                      >
                        Ver Detalles
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
