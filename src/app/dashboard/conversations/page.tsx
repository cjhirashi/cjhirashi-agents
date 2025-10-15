import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default function ConversationsPage() {
  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Conversaciones</h1>
        <p className="text-muted-foreground mt-2">
          Tus conversaciones activas con los agentes
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Sin conversaciones activas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Comienza una nueva conversación seleccionando un agente desde el dashboard.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
