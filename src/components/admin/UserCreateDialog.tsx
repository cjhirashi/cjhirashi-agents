"use client";

/**
 * UserCreateDialog Component
 *
 * Dialog modal para crear un nuevo usuario:
 * - Form fields: email, name, password, role, subscriptionTier
 * - Validación con Zod
 * - Toast notifications
 * - Loading states
 */

import { useState } from "react";
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
import type { CreateUserData, UserRole, SubscriptionTier } from "@/hooks/useAdminUsers";
import { UserPlus, Loader2 } from "lucide-react";

interface UserCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: CreateUserData) => Promise<void>;
}

// Validation schema
const userCreateSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres').max(100),
  password: z.string().min(8, 'Contraseña debe tener al menos 8 caracteres'),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'INVITED_AGENT', 'INVITED_STORAGE', 'SUBSCRIBER', 'USER']),
  subscriptionTier: z.enum(['FREE', 'BASIC', 'PRO', 'ENTERPRISE', 'CUSTOM', 'UNLIMITED']),
});

type FormData = z.infer<typeof userCreateSchema>;

export function UserCreateDialog({
  open,
  onClose,
  onCreate,
}: UserCreateDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    name: '',
    password: '',
    role: 'USER',
    subscriptionTier: 'FREE',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      // Validate with Zod
      const validatedData = userCreateSchema.parse(formData);

      // Call onCreate handler
      await onCreate(validatedData);

      toast({
        title: 'Usuario creado',
        description: `${validatedData.name} ha sido creado exitosamente.`,
      });

      // Reset form
      setFormData({
        email: '',
        name: '',
        password: '',
        role: 'USER',
        subscriptionTier: 'FREE',
      });

      onClose();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Validation errors
        const fieldErrors: Partial<Record<keyof FormData, string>> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof FormData] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        // API errors
        toast({
          title: 'Error al crear usuario',
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
      // Reset form on close
      setFormData({
        email: '',
        name: '',
        password: '',
        role: 'USER',
        subscriptionTier: 'FREE',
      });
      setErrors({});
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Crear Nuevo Usuario
          </DialogTitle>
          <DialogDescription>
            Ingresa los datos del nuevo usuario. Se creará una cuenta con la información proporcionada.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="usuario@ejemplo.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={isSubmitting}
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              type="text"
              placeholder="Juan Pérez"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={isSubmitting}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña *</Label>
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              disabled={isSubmitting}
              className={errors.password ? 'border-destructive' : ''}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role">Rol *</Label>
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
            <Label htmlFor="tier">Plan de Suscripción *</Label>
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
                    <span>Gratis - Límites básicos</span>
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
                  Creando...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Crear Usuario
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
