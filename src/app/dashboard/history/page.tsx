import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History } from "lucide-react";

export default function HistoryPage() {
  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Historial</h1>
        <p className="text-muted-foreground mt-2">
          Revisa tus conversaciones anteriores
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Sin historial
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Tus conversaciones pasadas aparecerán aquí.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
