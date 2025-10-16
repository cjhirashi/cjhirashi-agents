"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, Settings, TrendingUp, Users, MessageSquare, Zap } from "lucide-react";

type UserMetricsDialogProps = {
  userId: string | null;
  userName: string | null;
  isOpen: boolean;
  onClose: () => void;
};

type MetricsData = {
  user: {
    id: string;
    email: string;
    name: string | null;
    subscriptionTier: string;
    createdAt: string;
  };
  limits: {
    monthlyMessageLimit: number | null;
    monthlyTokenLimit: string | null;
    currentMonthMessages: number;
    currentMonthTokens: string;
    messageLimitPercentage: number;
    tokenLimitPercentage: number;
  };
  stats: {
    totalSessions: number;
    totalConversations: number;
    totalMessages: number;
    totalAgentsCreated: number;
    averageMessagesPerSession: number;
  };
  charts: {
    messagesPerDay: Array<{ date: string; count: number }>;
    agentUsage: Array<{ agentName: string; messageCount: number }>;
    recentActivity: Array<{ date: string; messages: number }>;
  };
};

export function UserMetricsDialog({
  userId,
  userName,
  isOpen,
  onClose,
}: UserMetricsDialogProps) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [limits, setLimits] = useState<{
    subscriptionTier: string;
    monthlyMessageLimit: string;
    monthlyTokenLimit: string;
  }>({
    subscriptionTier: "FREE",
    monthlyMessageLimit: "",
    monthlyTokenLimit: "",
  });
  const [savingLimits, setSavingLimits] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      loadMetrics();
    }
  }, [isOpen, userId]);

  const loadMetrics = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/metrics`);
      if (!res.ok) throw new Error("Failed to fetch metrics");

      const data = await res.json();
      setMetrics(data);

      // Inicializar campos de límites
      setLimits({
        subscriptionTier: data.user.subscriptionTier || "FREE",
        monthlyMessageLimit: data.limits.monthlyMessageLimit?.toString() || "",
        monthlyTokenLimit: data.limits.monthlyTokenLimit || "",
      });
    } catch (error) {
      console.error("Error loading metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveLimits = async () => {
    if (!userId) return;

    setSavingLimits(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/limits`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionTier: limits.subscriptionTier,
          monthlyMessageLimit: limits.monthlyMessageLimit === "" ? null : parseInt(limits.monthlyMessageLimit),
          monthlyTokenLimit: limits.monthlyTokenLimit === "" ? null : limits.monthlyTokenLimit,
        }),
      });

      if (!res.ok) throw new Error("Failed to update limits");

      alert("Límites actualizados correctamente");
      await loadMetrics();
    } catch (error) {
      console.error("Error saving limits:", error);
      alert("Error al actualizar los límites");
    } finally {
      setSavingLimits(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-background/98 backdrop-blur-xl border-2">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Métricas de {userName || "Usuario"}
          </DialogTitle>
          <DialogDescription>
            Visualiza el uso y configura límites personalizados
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Cargando métricas...</p>
          </div>
        ) : metrics ? (
          <Tabs defaultValue="metrics" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="metrics">
                <TrendingUp className="h-4 w-4 mr-2" />
                Métricas y Gráficas
              </TabsTrigger>
              <TabsTrigger value="limits">
                <Settings className="h-4 w-4 mr-2" />
                Límites y Suscripción
              </TabsTrigger>
            </TabsList>

            <TabsContent value="metrics" className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Sesiones Totales
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.stats.totalSessions}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Mensajes Totales
                    </CardTitle>
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.stats.totalMessages}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Agentes Creados
                    </CardTitle>
                    <Zap className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.stats.totalAgentsCreated}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Promedio Msg/Sesión
                    </CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.stats.averageMessagesPerSession}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Usage Progress */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Uso de Mensajes</CardTitle>
                    <CardDescription>
                      {metrics.limits.currentMonthMessages} de{" "}
                      {metrics.limits.monthlyMessageLimit || "∞"} mensajes usados
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progreso</span>
                        <span className="font-bold">
                          {metrics.limits.messageLimitPercentage}%
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(metrics.limits.messageLimitPercentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Uso de Tokens</CardTitle>
                    <CardDescription>
                      {metrics.limits.currentMonthTokens} de{" "}
                      {metrics.limits.monthlyTokenLimit || "∞"} tokens usados
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progreso</span>
                        <span className="font-bold">
                          {metrics.limits.tokenLimitPercentage}%
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(metrics.limits.tokenLimitPercentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <Card>
                <CardHeader>
                  <CardTitle>Mensajes por Día (Últimos 30 días)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={metrics.charts.messagesPerDay}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="count" stroke="#3b82f6" name="Mensajes" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {metrics.charts.agentUsage.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Uso por Agente</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={metrics.charts.agentUsage}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="agentName" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="messageCount" fill="#10b981" name="Mensajes" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="limits" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración de Límites</CardTitle>
                  <CardDescription>
                    Personaliza los límites de uso para este usuario
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="subscription">Tipo de Suscripción</Label>
                    <Select
                      value={limits.subscriptionTier}
                      onValueChange={(value) =>
                        setLimits({ ...limits, subscriptionTier: value })
                      }
                    >
                      <SelectTrigger id="subscription">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FREE">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">FREE</Badge>
                            <span>100 mensajes/mes</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="PRO">
                          <div className="flex items-center gap-2">
                            <Badge>PRO</Badge>
                            <span>1,000 mensajes/mes</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="BUSINESS">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">BUSINESS</Badge>
                            <span>Ilimitado</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="messageLimit">
                      Límite de Mensajes Mensuales (vacío = ilimitado)
                    </Label>
                    <Input
                      id="messageLimit"
                      type="number"
                      placeholder="Ej: 1000"
                      value={limits.monthlyMessageLimit}
                      onChange={(e) =>
                        setLimits({ ...limits, monthlyMessageLimit: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tokenLimit">
                      Límite de Tokens Mensuales (vacío = ilimitado)
                    </Label>
                    <Input
                      id="tokenLimit"
                      type="number"
                      placeholder="Ej: 100000"
                      value={limits.monthlyTokenLimit}
                      onChange={(e) =>
                        setLimits({ ...limits, monthlyTokenLimit: e.target.value })
                      }
                    />
                  </div>

                  <Button
                    onClick={saveLimits}
                    disabled={savingLimits}
                    className="w-full"
                  >
                    {savingLimits ? "Guardando..." : "Guardar Límites"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Información del Usuario</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium">{metrics.user.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Suscripción:</span>
                    <Badge>{metrics.user.subscriptionTier}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Miembro desde:</span>
                    <span className="font-medium">
                      {new Date(metrics.user.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">No se pudieron cargar las métricas</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
