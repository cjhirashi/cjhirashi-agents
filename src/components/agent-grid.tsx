"use client";

import { AgentCard, Agent } from "@/components/agent-card";

// Mock data de agentes - Esto eventualmente vendrá de la base de datos
const mockAgents: Agent[] = [
  {
    id: "code-assistant",
    name: "Code Assistant",
    description: "Asistente especializado en programación, debugging y arquitectura de software. Te ayuda a escribir código limpio y eficiente.",
    model: "Gemini 2.0 Flash",
    color: "cyan",
    tags: ["Código", "Debugging", "Arquitectura"],
  },
  {
    id: "data-analyst",
    name: "Data Analyst",
    description: "Experto en análisis de datos, visualizaciones y estadísticas. Procesa y analiza grandes volúmenes de información.",
    model: "Gemini 2.0 Flash",
    color: "purple",
    tags: ["Datos", "Analytics", "Visualización"],
  },
  {
    id: "content-writer",
    name: "Content Writer",
    description: "Creador de contenido profesional para blogs, redes sociales y documentación técnica con estilo adaptable.",
    model: "Gemini 2.0 Flash",
    color: "emerald",
    tags: ["Escritura", "Marketing", "Docs"],
  },
  {
    id: "research-assistant",
    name: "Research Assistant",
    description: "Asistente de investigación que busca, sintetiza y organiza información de múltiples fuentes de forma estructurada.",
    model: "Gemini 2.0 Flash",
    color: "amber",
    tags: ["Investigación", "Síntesis", "Documentación"],
  },
  {
    id: "creative-designer",
    name: "Creative Designer",
    description: "Especialista en diseño UI/UX, generación de ideas creativas y conceptos visuales para proyectos digitales.",
    model: "Gemini 2.0 Flash",
    color: "rose",
    tags: ["Diseño", "UI/UX", "Creatividad"],
  },
  {
    id: "devops-expert",
    name: "DevOps Expert",
    description: "Experto en infraestructura, CI/CD, containerización y automatización de procesos de desarrollo y deployment.",
    model: "Gemini 2.0 Flash",
    color: "blue",
    tags: ["DevOps", "CI/CD", "Cloud"],
  },
];

export function AgentGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {mockAgents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
}
