"use client";

/**
 * UserTable Component
 *
 * Tabla de usuarios con:
 * - Columnas: email, name, role, tier, status, actions
 * - Sorting (client-side)
 * - Pagination controls
 * - Search/filter
 * - Role badges con colores
 * - Tier badges
 * - Actions: Edit, Delete, View Metrics
 * - Loading state
 * - Empty state
 */

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User } from "@/hooks/useAdminUsers";
import {
  MoreVertical,
  Edit,
  Trash2,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface UserTableProps {
  users: User[];
  totalUsers: number;
  page: number;
  limit: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onViewMetrics: (user: User) => void;
  isLoading: boolean;
  currentUserEmail?: string; // To prevent editing/deleting self
}

type SortField = 'email' | 'name' | 'role' | 'tier' | 'status' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export function UserTable({
  users,
  totalUsers,
  page,
  limit,
  totalPages,
  onPageChange,
  onEdit,
  onDelete,
  onViewMetrics,
  isLoading,
  currentUserEmail,
}: UserTableProps) {
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Sorting logic
  const sortedUsers = [...users].sort((a, b) => {
    let aValue: string | number | boolean;
    let bValue: string | number | boolean;

    switch (sortField) {
      case 'email':
        aValue = a.email || '';
        bValue = b.email || '';
        break;
      case 'name':
        aValue = a.name || '';
        bValue = b.name || '';
        break;
      case 'role':
        aValue = a.role;
        bValue = b.role;
        break;
      case 'tier':
        aValue = a.subscriptionTier;
        bValue = b.subscriptionTier;
        break;
      case 'status':
        aValue = a.isActive;
        bValue = b.isActive;
        break;
      case 'createdAt':
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getRoleBadgeVariant = (role: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'destructive';
      case 'ADMIN':
        return 'default';
      case 'SUBSCRIBER':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Super Admin';
      case 'ADMIN':
        return 'Admin';
      case 'SUBSCRIBER':
        return 'Suscriptor';
      case 'INVITED_AGENT':
        return 'Invitado (Agentes)';
      case 'INVITED_STORAGE':
        return 'Invitado (Storage)';
      case 'USER':
        return 'Usuario';
      default:
        return role;
    }
  };

  const getTierBadgeVariant = (tier: string): 'default' | 'secondary' | 'outline' => {
    switch (tier) {
      case 'FREE':
        return 'outline';
      case 'BASIC':
        return 'secondary';
      case 'PRO':
      case 'ENTERPRISE':
      case 'UNLIMITED':
        return 'default';
      default:
        return 'secondary';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Cargando usuarios...</p>
      </div>
    );
  }

  // Empty state
  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground mb-2">No se encontraron usuarios</p>
        <p className="text-sm text-muted-foreground">
          Intenta ajustar los filtros de búsqueda
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('email')}
                  className="hover:bg-transparent p-0 h-auto font-semibold"
                >
                  Email
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('name')}
                  className="hover:bg-transparent p-0 h-auto font-semibold"
                >
                  Nombre
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('role')}
                  className="hover:bg-transparent p-0 h-auto font-semibold"
                >
                  Rol
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('tier')}
                  className="hover:bg-transparent p-0 h-auto font-semibold"
                >
                  Plan
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('status')}
                  className="hover:bg-transparent p-0 h-auto font-semibold"
                >
                  Estado
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedUsers.map((user) => {
              const isSelf = currentUserEmail && user.email === currentUserEmail;

              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.email}
                    {isSelf && (
                      <Badge variant="outline" className="ml-2">
                        Tú
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{user.name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getTierBadgeVariant(user.subscriptionTier)}>
                      {user.subscriptionTier}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.isActive ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Activo</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-destructive" />
                        <span className="text-sm">Inactivo</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onViewMetrics(user)}>
                          <BarChart3 className="mr-2 h-4 w-4" />
                          Ver Métricas
                        </DropdownMenuItem>
                        {!isSelf && (
                          <>
                            <DropdownMenuItem onClick={() => onEdit(user)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onDelete(user)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Mostrando {users.length} de {totalUsers} usuarios
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <span className="text-sm">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
