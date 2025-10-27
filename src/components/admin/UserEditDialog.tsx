"use client";

/**
 * UserEditDialog Component
 *
 * Dialog modal para editar un usuario existente:
 * - Form fields: name, role, subscriptionTier, isActive
 * - Validación con Zod
 * - Toast notifications
 * - Loading states
 */

import { useState, useEffect } from "react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { User, UpdateUserData, UserRole, SubscriptionTier } from "@/hooks/useAdminUsers";
import { Edit, Loader2 } from "lucide-react";

interface UserEditDialogProps {
  user: User | null;
  open: boolean;
  onClose: () => void;
  onSave: (userId: string, data: UpdateUserData) => Promise<void>;
}

// Validation schema
const userEditSchema = z.object({
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres').max(100).optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'INVITED_AGENT', 'INVITED_STORAGE', 'SUBSCRIBER', 'USER']),
  subscriptionTier: z.enum(['FREE', 'BASIC', 'PRO', 'ENTERPRISE', 'CUSTOM', 'UNLIMITED']),
  isActive: z.boolean(),
});

type FormData = z.infer<typeof userEditSchema>;

export function UserEditDialog({
  user,
  open,
  onClose,
  onSave,
}: UserEditDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    role: 'USER',
    subscriptionTier: 'FREE',
    isActive: true,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  // Update form when user changes
  useEffect(() => {
    if (user && open) {
      setFormData({
        name: user.name || '',
        role: user.role,
        subscriptionTier: user.subscriptionTier,
        isActive: user.isActive,
      });
      setErrors({});
    }
  }, [user, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      // Validate with Zod
      const validatedData = userEditSchema.parse(formData);

      // Build update data (only changed fields)
      const updateData: UpdateUserData = {};
      if (validatedData.name && validatedData.name !== user.name) {
        updateData.name = validatedData.name;
      }
      if (validatedData.role !== user.role) {
        updateData.role = validatedData.role;
      }
      if (validatedData.subscriptionTier !== user.subscriptionTier) {
        updateData.subscriptionTier = validatedData.subscriptionTier;
      }
      if (validatedData.isActive !== user.isActive) {
        updateData.isActive = validatedData.isActive;
      }

      // Only call API if there are changes
      if (Object.keys(updateData).length === 0) {
        toast({
          title: 'Sin cambios',
          description: 'No se detectaron cambios en el usuario.',
        });
        onClose();
        return;
      }

      // Call onSave handler
      await onSave(user.id, updateData);

      toast({
        title: 'Usuario actualizado',
        description: `${user.name || user.email} ha sido actualizado exitosamente.`,
      });

      onClose();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Validation errors
        const fieldErrors: Partial<Record<keyof FormData, string>> = {};
        error.issues.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof FormData] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        // API errors
        toast({
          title: 'Error al actualizar usuario',
          description: error instanceof Error ? error.message : 'Ocurrió un error desconocido',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setErrors({});
      onClose();
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Editar Usuario
          </DialogTitle>
          <DialogDescription>
            Modifica los datos de {user.name || user.email}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              El email no se puede modificar
            </p>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              type="text"
              placeholder="Nombre del usuario"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={isSubmitting}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role">Rol</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
              disabled={isSubmitting}
            >
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">USER</Badge>
                    <span>Usuario</span>
                  </div>
                </SelectItem>
                <SelectItem value="SUBSCRIBER">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">SUBSCRIBER</Badge>
                    <span>Suscriptor</span>
                  </div>
                </SelectItem>
                <SelectItem value="INVITED_AGENT">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">INVITED_AGENT</Badge>
                    <span>Invitado (Agentes)</span>
                  </div>
                </SelectItem>
                <SelectItem value="INVITED_STORAGE">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">INVITED_STORAGE</Badge>
                    <span>Invitado (Storage)</span>
                  </div>
                </SelectItem>
                <SelectItem value="ADMIN">
                  <div className="flex items-center gap-2">
                    <Badge>ADMIN</Badge>
                    <span>Administrador</span>
                  </div>
                </SelectItem>
                <SelectItem value="SUPER_ADMIN">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">SUPER_ADMIN</Badge>
                    <span>Super Administrador</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-sm text-destructive">{errors.role}</p>
            )}
          </div>

          {/* Subscription Tier */}
          <div className="space-y-2">
            <Label htmlFor="tier">Plan de Suscripción</Label>
            <Select
              value={formData.subscriptionTier}
              onValueChange={(value) => setFormData({ ...formData, subscriptionTier: value as SubscriptionTier })}
              disabled={isSubmitting}
            >
              <SelectTrigger id="tier">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FREE">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">FREE</Badge>
                    <span>Gratis</span>
                  </div>
                </SelectItem>
                <SelectItem value="BASIC">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">BASIC</Badge>
                    <span>Básico</span>
                  </div>
                </SelectItem>
                <SelectItem value="PRO">
                  <div className="flex items-center gap-2">
                    <Badge>PRO</Badge>
                    <span>Profesional</span>
                  </div>
                </SelectItem>
                <SelectItem value="ENTERPRISE">
                  <div className="flex items-center gap-2">
                    <Badge>ENTERPRISE</Badge>
                    <span>Empresarial</span>
                  </div>
                </SelectItem>
                <SelectItem value="CUSTOM">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">CUSTOM</Badge>
                    <span>Personalizado</span>
                  </div>
                </SelectItem>
                <SelectItem value="UNLIMITED">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">UNLIMITED</Badge>
                    <span>Ilimitado</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.subscriptionTier && (
              <p className="text-sm text-destructive">{errors.subscriptionTier}</p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Estado</Label>
            <Select
              value={formData.isActive ? 'active' : 'inactive'}
              onValueChange={(value) => setFormData({ ...formData, isActive: value === 'active' })}
              disabled={isSubmitting}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-500">Activo</Badge>
                    <span>Usuario puede acceder</span>
                  </div>
                </SelectItem>
                <SelectItem value="inactive">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Inactivo</Badge>
                    <span>Acceso bloqueado</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Edit className="mr-2 h-4 w-4" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
