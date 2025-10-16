"use client";

import { useEffect, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Users, Bot, Check, X, Globe, Mail, Plus, Trash2, Clock, BarChart3 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { UserMetricsDialog } from "@/components/admin/UserMetricsDialog";

type User = {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  agentPermissions: Array<{
    id: string;
    agent: {
      id: string;
      name: string;
      description: string | null;
    };
  }>;
};

type Agent = {
  id: string;
  name: string;
  description: string | null;
  model: string;
  isPublic: boolean;
  createdAt: string;
  creator: {
    id: string;
    email: string | null;
    name: string | null;
  };
};

type Invitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  inviter: {
    id: string;
    name: string | null;
    email: string | null;
  };
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [newInviteEmail, setNewInviteEmail] = useState("");
  const [newInviteRole, setNewInviteRole] = useState("USER");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [isMetricsDialogOpen, setIsMetricsDialogOpen] = useState(false);
  const [selectedMetricsUserId, setSelectedMetricsUserId] = useState<string | null>(null);
  const [selectedMetricsUserName, setSelectedMetricsUserName] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [isAgentsListDialogOpen, setIsAgentsListDialogOpen] = useState(false);
  const [selectedUserAgents, setSelectedUserAgents] = useState<User | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated") {
      loadData();
    }
  }, [status, router]);

  const loadData = async () => {
    try {
      const [usersRes, agentsRes, invitationsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/agents"),
        fetch("/api/admin/invitations"),
      ]);

      if (!usersRes.ok || !agentsRes.ok || !invitationsRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const usersData = await usersRes.json();
      const agentsData = await agentsRes.json();
      const invitationsData = await invitationsRes.json();

      setUsers(usersData.users || []);
      setAgents(agentsData.agents || []);
      setInvitations(invitationsData.invitations || []);

      // Obtener el rol del usuario actual
      if (session?.user?.email) {
        const currentUser = usersData.users.find(
          (u: User) => u.email === session.user.email
        );
        setCurrentUserRole(currentUser?.role || null);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, role: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });

      if (!res.ok) throw new Error("Failed to update role");

      await loadData();
    } catch (error) {
      console.error("Error updating role:", error);
    }
  };

  const toggleUserActive = async (userId: string, isActive: boolean) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, isActive }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      await loadData();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const grantPermission = async (userId: string, agentId: string) => {
    try {
      const res = await fetch("/api/admin/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, agentId }),
      });

      if (!res.ok) throw new Error("Failed to grant permission");

      await loadData();
    } catch (error) {
      console.error("Error granting permission:", error);
    }
  };

  const revokePermission = async (userId: string, agentId: string) => {
    try {
      const res = await fetch(
        `/api/admin/permissions?userId=${userId}&agentId=${agentId}`,
        { method: "DELETE" }
      );

      if (!res.ok) throw new Error("Failed to revoke permission");

      await loadData();
    } catch (error) {
      console.error("Error revoking permission:", error);
    }
  };

  const toggleAgentPublic = async (agentId: string, isPublic: boolean) => {
    try {
      const res = await fetch("/api/admin/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, isPublic }),
      });

      if (!res.ok) throw new Error("Failed to update agent");

      await loadData();
    } catch (error) {
      console.error("Error updating agent:", error);
    }
  };

  const createInvitation = async () => {
    if (!newInviteEmail.trim()) {
      alert("Por favor ingresa un email válido");
      return;
    }

    setInviteLoading(true);
    try {
      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newInviteEmail,
          role: newInviteRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Error al crear la invitación");
        return;
      }

      setNewInviteEmail("");
      setNewInviteRole("USER");
      setIsInviteDialogOpen(false);
      await loadData();
      alert("Invitación creada exitosamente");
    } catch (error) {
      console.error("Error creating invitation:", error);
      alert("Error al crear la invitación");
    } finally {
      setInviteLoading(false);
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    if (!confirm("¿Estás seguro de que deseas cancelar esta invitación?")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/invitations?id=${invitationId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to cancel invitation");

      await loadData();
    } catch (error) {
      console.error("Error cancelling invitation:", error);
      alert("Error al cancelar la invitación");
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "PENDING":
        return "default";
      case "ACCEPTED":
        return "secondary";
      case "EXPIRED":
        return "outline";
      case "CANCELLED":
        return "destructive";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING":
        return "Pendiente";
      case "ACCEPTED":
        return "Aceptada";
      case "EXPIRED":
        return "Expirada";
      case "CANCELLED":
        return "Cancelada";
      default:
        return status;
    }
  };

  const openMetricsDialog = (userId: string, userName: string | null) => {
    setSelectedMetricsUserId(userId);
    setSelectedMetricsUserName(userName);
    setIsMetricsDialogOpen(true);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "Super Admin";
      case "ADMIN":
        return "Admin";
      case "MANAGER":
        return "Manager";
      case "DEVELOPER":
        return "Developer";
      case "USER":
        return "Usuario";
      case "GUEST":
        return "Invitado";
      default:
        return role;
    }
  };

  const openAgentsListDialog = (user: User) => {
    setSelectedUserAgents(user);
    setIsAgentsListDialogOpen(true);
  };

  const deleteUser = async (userId: string, userName: string | null, userEmail: string | null) => {
    const displayName = userName || userEmail || "este usuario";

    if (!confirm(
      `⚠️ ADVERTENCIA: Esta acción NO se puede deshacer.\n\n` +
      `Se eliminará permanentemente a ${displayName} y toda su información:\n` +
      `- Perfil de usuario\n` +
      `- Agentes creados\n` +
      `- Conversaciones y mensajes\n` +
      `- Permisos y configuraciones\n\n` +
      `¿Estás seguro de que deseas continuar?`
    )) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Error al eliminar el usuario");
        return;
      }

      alert(`Usuario ${displayName} eliminado exitosamente`);
      await loadData();
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Error al eliminar el usuario");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Administración
        </h1>
        <p className="text-muted-foreground mt-2">
          Gestiona usuarios, roles y permisos de acceso a agentes
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1.5 glass-card glass-shadow rounded-xl">
          <TabsTrigger
            value="users"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xl data-[state=inactive]:text-muted-foreground transition-all duration-300 py-3 px-4 rounded-lg font-semibold hover:bg-accent/50"
          >
            <Users className="h-4 w-4 mr-2" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger
            value="agents"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xl data-[state=inactive]:text-muted-foreground transition-all duration-300 py-3 px-4 rounded-lg font-semibold hover:bg-accent/50"
          >
            <Bot className="h-4 w-4 mr-2" />
            Agentes
          </TabsTrigger>
          <TabsTrigger
            value="invitations"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xl data-[state=inactive]:text-muted-foreground transition-all duration-300 py-3 px-4 rounded-lg font-semibold hover:bg-accent/50"
          >
            <Mail className="h-4 w-4 mr-2" />
            Invitaciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usuarios del Sistema</CardTitle>
              <CardDescription>
                Gestiona los roles y permisos de los usuarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Agentes</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {/* Solo SUPER_ADMIN puede editar roles, excepto su propio rol */}
                        {currentUserRole === "SUPER_ADMIN" && session?.user?.email !== user.email ? (
                          <Select
                            value={user.role}
                            onValueChange={(value) => updateUserRole(user.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USER">Usuario</SelectItem>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                              <SelectItem value="DEVELOPER">Developer</SelectItem>
                              <SelectItem value="MANAGER">Manager</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={user.role === "SUPER_ADMIN" ? "default" : "secondary"}>
                            {getRoleLabel(user.role)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleUserActive(user.id, !user.isActive)}
                          className="hover:bg-transparent p-0"
                        >
                          <Badge
                            variant={user.isActive ? "default" : "destructive"}
                            className={user.isActive ? "bg-green-500 hover:bg-green-600 cursor-pointer" : "cursor-pointer"}
                          >
                            {user.isActive ? (
                              <>
                                <Check className="h-3 w-3 mr-1" />
                                Activo
                              </>
                            ) : (
                              <>
                                <X className="h-3 w-3 mr-1" />
                                Inactivo
                              </>
                            )}
                          </Badge>
                        </Button>
                      </TableCell>
                      <TableCell>
                        {user.agentPermissions.length > 0 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAgentsListDialog(user)}
                          >
                            <Bot className="h-4 w-4 mr-1" />
                            {user.agentPermissions.length} {user.agentPermissions.length === 1 ? 'Agente' : 'Agentes'}
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Sin agentes
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          {/* Ver Métricas - Siempre visible */}
                          <Button
                            variant="default"
                            size="sm"
                            className="w-full"
                            onClick={() => openMetricsDialog(user.id, user.name)}
                          >
                            <BarChart3 className="h-4 w-4 mr-1" />
                            Ver Métricas
                          </Button>

                          {/* Gestionar Permisos - Solo si NO es el propio usuario */}
                          {session?.user?.email !== user.email && (
                            <Dialog
                              open={isPermissionDialogOpen && selectedUser?.id === user.id}
                              onOpenChange={(open) => {
                                setIsPermissionDialogOpen(open);
                                if (open) setSelectedUser(user);
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="w-full">
                                  Gestionar Permisos
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Permisos de {user.name}</DialogTitle>
                                  <DialogDescription>
                                    Selecciona los agentes a los que tiene acceso
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-2 mt-4">
                                  {agents.map((agent) => {
                                    const hasAccess = user.agentPermissions.some(
                                      (p) => p.agent.id === agent.id
                                    );
                                    return (
                                      <div
                                        key={agent.id}
                                        className="flex items-center justify-between p-3 border rounded"
                                      >
                                        <div>
                                          <p className="font-medium">{agent.name}</p>
                                          <p className="text-sm text-muted-foreground">
                                            {agent.description || "Sin descripción"}
                                          </p>
                                        </div>
                                        <Button
                                          variant={hasAccess ? "destructive" : "default"}
                                          size="sm"
                                          onClick={() =>
                                            hasAccess
                                              ? revokePermission(user.id, agent.id)
                                              : grantPermission(user.id, agent.id)
                                          }
                                        >
                                          {hasAccess ? "Revocar" : "Conceder"}
                                        </Button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}

                          {/* Eliminar - Solo si NO es el propio usuario Y es SUPER_ADMIN */}
                          {session?.user?.email !== user.email && currentUserRole === "SUPER_ADMIN" && (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="w-full"
                              onClick={() => deleteUser(user.id, user.name, user.email)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Eliminar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agentes del Sistema</CardTitle>
              <CardDescription>
                Gestiona la visibilidad de los agentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {agents.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay agentes registrados en el sistema.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Creador</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Visibilidad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell className="font-medium">{agent.name}</TableCell>
                        <TableCell>
                          {agent.creator.name || agent.creator.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{agent.model}</Badge>
                        </TableCell>
                        <TableCell className="max-w-md truncate">
                          {agent.description || "Sin descripción"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant={agent.isPublic ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleAgentPublic(agent.id, !agent.isPublic)}
                          >
                            {agent.isPublic ? (
                              <>
                                <Globe className="h-4 w-4 mr-1" />
                                Público
                              </>
                            ) : (
                              <>
                                <X className="h-4 w-4 mr-1" />
                                Privado
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Invitaciones de Usuario</CardTitle>
                <CardDescription>
                  Envía invitaciones por email para que nuevos usuarios se registren
                </CardDescription>
              </div>
              <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Invitación
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Enviar Invitación</DialogTitle>
                    <DialogDescription>
                      Ingresa el email del usuario que deseas invitar
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="usuario@ejemplo.com"
                        value={newInviteEmail}
                        onChange={(e) => setNewInviteEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Rol</Label>
                      <Select value={newInviteRole} onValueChange={setNewInviteRole}>
                        <SelectTrigger id="role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USER">Usuario</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      className="w-full"
                      onClick={createInvitation}
                      disabled={inviteLoading}
                    >
                      {inviteLoading ? "Enviando..." : "Enviar Invitación"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {invitations.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay invitaciones registradas.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Invitado por</TableHead>
                      <TableHead>Expira</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map((invitation) => {
                      const isExpired = new Date(invitation.expiresAt) < new Date();
                      const isPending = invitation.status === "PENDING";

                      return (
                        <TableRow key={invitation.id}>
                          <TableCell className="font-medium">
                            {invitation.email}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {invitation.role === "ADMIN" ? "Admin" : "Usuario"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(invitation.status) as any}>
                              {getStatusLabel(invitation.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {invitation.inviter.name || invitation.inviter.email}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span className="text-sm">
                                {isExpired
                                  ? "Expirada"
                                  : new Date(invitation.expiresAt).toLocaleDateString()}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {isPending && !isExpired && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => cancelInvitation(invitation.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Cancelar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <UserMetricsDialog
        userId={selectedMetricsUserId}
        userName={selectedMetricsUserName}
        isOpen={isMetricsDialogOpen}
        onClose={() => {
          setIsMetricsDialogOpen(false);
          setSelectedMetricsUserId(null);
          setSelectedMetricsUserName(null);
        }}
      />

      {/* Dialog para lista de agentes */}
      <Dialog open={isAgentsListDialogOpen} onOpenChange={setIsAgentsListDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Agentes de {selectedUserAgents?.name || "Usuario"}
            </DialogTitle>
            <DialogDescription>
              Lista de agentes a los que tiene acceso este usuario
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {selectedUserAgents && selectedUserAgents.agentPermissions.length > 0 ? (
              selectedUserAgents.agentPermissions.map((perm) => (
                <div
                  key={perm.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{perm.agent.name}</p>
                    </div>
                    {perm.agent.description && (
                      <p className="text-sm text-muted-foreground mt-1 ml-6">
                        {perm.agent.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary">
                    Acceso concedido
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Este usuario no tiene acceso a ningún agente</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
