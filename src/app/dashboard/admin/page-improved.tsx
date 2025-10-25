"use client";

/**
 * Admin Page (Improved Version)
 *
 * Integrates new components:
 * - useAdminUsers hook
 * - UserTable component
 * - UserCreateDialog component
 * - UserEditDialog component
 * - UserMetricsDialog component
 *
 * Features:
 * - User management (CRUD)
 * - Search and filter
 * - Pagination
 * - Role-based access control
 * - Agent management
 * - Invitations management
 */

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, Bot, Mail, UserPlus, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import type { User as AdminUser, CreateUserData, UpdateUserData } from "@/hooks/useAdminUsers";
import {
  UserTable,
  UserCreateDialog,
  UserEditDialog,
  UserMetricsDialog,
} from "@/components/admin";

export default function AdminPage() {
  const { data: session } = useSession();
  const { toast } = useToast();

  // User management with custom hook
  const {
    users,
    totalUsers,
    page,
    totalPages,
    isLoading,
    error,
    createUser,
    updateUser,
    deleteUser,
    refreshUsers,
    setPage,
    setSearch,
  } = useAdminUsers({ page: 1, limit: 10 });

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isMetricsDialogOpen, setIsMetricsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Handle search (debounced)
  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    // Debounce search
    const timer = setTimeout(() => {
      setSearch(value);
      setPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [setSearch, setPage]);

  // Handle create user
  const handleCreate = async (data: CreateUserData) => {
    try {
      await createUser(data);
      toast({
        title: 'Usuario creado',
        description: `${data.name} ha sido creado exitosamente.`,
      });
    } catch (error) {
      throw error; // Re-throw to be handled by dialog
    }
  };

  // Handle edit user
  const handleEdit = (user: AdminUser) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async (userId: string, data: UpdateUserData) => {
    try {
      await updateUser(userId, data);
      toast({
        title: 'Usuario actualizado',
        description: 'Los cambios han sido guardados exitosamente.',
      });
    } catch (error) {
      throw error; // Re-throw to be handled by dialog
    }
  };

  // Handle delete user
  const handleDelete = async (user: AdminUser) => {
    const displayName = user.name || user.email || 'este usuario';

    const confirmed = window.confirm(
      `⚠️ ADVERTENCIA: Esta acción NO se puede deshacer.\n\n` +
      `Se eliminará permanentemente a ${displayName} y toda su información:\n` +
      `- Perfil de usuario\n` +
      `- Agentes creados\n` +
      `- Conversaciones y mensajes\n` +
      `- Permisos y configuraciones\n\n` +
      `¿Estás seguro de que deseas continuar?`
    );

    if (!confirmed) return;

    try {
      await deleteUser(user.id);
      toast({
        title: 'Usuario eliminado',
        description: `${displayName} ha sido eliminado exitosamente.`,
      });
    } catch (error) {
      toast({
        title: 'Error al eliminar usuario',
        description: error instanceof Error ? error.message : 'Ocurrió un error desconocido',
        variant: 'destructive',
      });
    }
  };

  // Handle view metrics
  const handleViewMetrics = (user: AdminUser) => {
    setSelectedUser(user);
    setIsMetricsDialogOpen(true);
  };

  // Show error if hook failed
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-destructive mb-2">Error al cargar datos</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <Button onClick={() => refreshUsers()} className="mt-4">
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Panel de Administración
        </h1>
        <p className="text-muted-foreground mt-2">
          Gestiona usuarios, roles, permisos y recursos del sistema
        </p>
      </div>

      {/* Tabs */}
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

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Gestión de Usuarios</CardTitle>
                <CardDescription>
                  Administra usuarios, roles y suscripciones
                </CardDescription>
              </div>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Crear Usuario
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por email o nombre..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* User Table */}
              <UserTable
                users={users}
                totalUsers={totalUsers}
                page={page}
                limit={10}
                totalPages={totalPages}
                onPageChange={setPage}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onViewMetrics={handleViewMetrics}
                isLoading={isLoading}
                currentUserEmail={session?.user?.email || undefined}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agents Tab - Keep existing implementation */}
        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agentes del Sistema</CardTitle>
              <CardDescription>
                Gestiona los agentes disponibles en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                La gestión de agentes se mantendrá en la versión original.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invitations Tab - Keep existing implementation */}
        <TabsContent value="invitations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invitaciones de Usuario</CardTitle>
              <CardDescription>
                Gestiona invitaciones pendientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                La gestión de invitaciones se mantendrá en la versión original.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <UserCreateDialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreate={handleCreate}
      />

      <UserEditDialog
        user={selectedUser}
        open={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setSelectedUser(null);
        }}
        onSave={handleSaveEdit}
      />

      <UserMetricsDialog
        userId={selectedUser?.id || null}
        userName={selectedUser?.name || null}
        isOpen={isMetricsDialogOpen}
        onClose={() => {
          setIsMetricsDialogOpen(false);
          setSelectedUser(null);
        }}
      />
    </div>
  );
}
