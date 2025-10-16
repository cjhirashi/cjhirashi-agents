"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Send, Loader2 } from "lucide-react";

export default function NewTicketPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "QUESTION",
    priority: "MEDIUM",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.description.trim()) {
      alert("Por favor completa todos los campos requeridos");
      return;
    }

    setLoading(true);
    try {
      // Capturar metadata del navegador
      const metadata = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timestamp: new Date().toISOString(),
      };

      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          metadata,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al crear el ticket");
      }

      // Redirigir al ticket recién creado
      router.push(`/dashboard/support/${data.ticket.id}`);
    } catch (error) {
      console.error("Error creating ticket:", error);
      alert(error instanceof Error ? error.message : "Error al crear el ticket");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard/support")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Crear Ticket de Soporte</h1>
          <p className="text-muted-foreground mt-2">
            Reporta un problema o solicita ayuda
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Ticket</CardTitle>
          <CardDescription>
            Proporciona todos los detalles posibles para que podamos ayudarte mejor.
            Nuestra IA intentará resolver tu problema automáticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">
                Título <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Ej: No puedo iniciar sesión en mi cuenta"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">
                Categoría <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUG">🐛 Error en la aplicación</SelectItem>
                  <SelectItem value="FEATURE">✨ Solicitud de funcionalidad</SelectItem>
                  <SelectItem value="QUESTION">❓ Pregunta general</SelectItem>
                  <SelectItem value="ACCOUNT">👤 Problema con la cuenta</SelectItem>
                  <SelectItem value="BILLING">💳 Problema de facturación</SelectItem>
                  <SelectItem value="PERFORMANCE">⚡ Problema de rendimiento</SelectItem>
                  <SelectItem value="OTHER">📋 Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioridad</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  setFormData({ ...formData, priority: value })
                }
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Baja - Puede esperar</SelectItem>
                  <SelectItem value="MEDIUM">Media - Normal</SelectItem>
                  <SelectItem value="HIGH">Alta - Importante</SelectItem>
                  <SelectItem value="URGENT">Urgente - Crítico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Descripción <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Describe tu problema o pregunta con el mayor detalle posible. Incluye:&#10;- ¿Qué estabas intentando hacer?&#10;- ¿Qué sucedió?&#10;- ¿Qué esperabas que sucediera?&#10;- ¿Cuándo comenzó el problema?"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={10}
                required
              />
              <p className="text-sm text-muted-foreground">
                Cuanto más detallada sea tu descripción, más rápido podremos ayudarte
              </p>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando ticket...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Crear Ticket
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/support")}
                disabled={loading}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">💡 Consejos para obtener ayuda rápida</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• <strong>Sé específico:</strong> Incluye mensajes de error exactos si los hay</p>
          <p>• <strong>Pasos para reproducir:</strong> Enumera los pasos que llevaron al problema</p>
          <p>• <strong>Contexto:</strong> Menciona en qué parte del sistema ocurrió</p>
          <p>• <strong>Intentos de solución:</strong> ¿Ya intentaste algo para resolverlo?</p>
        </CardContent>
      </Card>
    </div>
  );
}
