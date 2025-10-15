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
import { Shield, Users, Bot, Check, X, Globe } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

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

export default function AdminPage() {
  const { status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);

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
      const [usersRes, agentsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/agents"),
      ]);

      if (!usersRes.ok || !agentsRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const usersData = await usersRes.json();
      const agentsData = await agentsRes.json();

      setUsers(usersData.users || []);
      setAgents(agentsData.agents || []);
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
        <TabsList>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="agents">
            <Bot className="h-4 w-4 mr-2" />
            Agentes
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
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant={user.isActive ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleUserActive(user.id, !user.isActive)}
                        >
                          {user.isActive ? (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Activo
                            </>
                          ) : (
                            <>
                              <X className="h-4 w-4 mr-1" />
                              Inactivo
                            </>
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.agentPermissions.length > 0 ? (
                            user.agentPermissions.map((perm) => (
                              <Badge key={perm.id} variant="secondary">
                                {perm.agent.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              Sin permisos
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Dialog
                          open={isPermissionDialogOpen && selectedUser?.id === user.id}
                          onOpenChange={(open) => {
                            setIsPermissionDialogOpen(open);
                            if (open) setSelectedUser(user);
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
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
      </Tabs>
    </div>
  );
}
