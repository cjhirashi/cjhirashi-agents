import { AgentGrid } from "@/components/agent-grid";

export default function AgentsPage() {
  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agentes</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona y explora todos tus agentes de IA
        </p>
      </div>

      <AgentGrid />
    </div>
  );
}
