"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChatMessage, type Message } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Bot, MoreVertical, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Mock agents data - Luego vendrá de la base de datos
const MOCK_AGENTS = {
  "code-assistant": {
    id: "code-assistant",
    name: "Code Assistant",
    description: "Experto en programación, debugging y mejores prácticas",
    model: "Gemini 2.0 Flash",
    color: "cyan",
  },
  "data-analyst": {
    id: "data-analyst",
    name: "Data Analyst",
    description: "Análisis de datos, visualizaciones y estadísticas",
    model: "Gemini 2.0 Flash",
    color: "purple",
  },
  "content-writer": {
    id: "content-writer",
    name: "Content Writer",
    description: "Creación de contenido, copywriting y storytelling",
    model: "Gemini 2.0 Flash",
    color: "emerald",
  },
  "research-assistant": {
    id: "research-assistant",
    name: "Research Assistant",
    description: "Investigación profunda y síntesis de información",
    model: "Gemini 2.0 Flash",
    color: "amber",
  },
  "creative-designer": {
    id: "creative-designer",
    name: "Creative Designer",
    description: "Ideas de diseño UI/UX y experiencia de usuario",
    model: "Gemini 2.0 Flash",
    color: "rose",
  },
  "devops-expert": {
    id: "devops-expert",
    name: "DevOps Expert",
    description: "Infraestructura, CI/CD y automatización",
    model: "Gemini 2.0 Flash",
    color: "blue",
  },
};

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params?.id as string;
  const agent = MOCK_AGENTS[agentId as keyof typeof MOCK_AGENTS];

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Si el agente no existe, redirigir al dashboard
  useEffect(() => {
    if (!agent) {
      router.push("/dashboard");
    }
  }, [agent, router]);

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Agregar mensaje del usuario
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Simular respuesta del agente (luego conectaremos con ADK)
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Esta es una respuesta de prueba de ${agent.name}. En la siguiente fase conectaremos con el agente ADK real para procesar tu mensaje: "${content}"`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleClearChat = () => {
    if (confirm("¿Estás seguro de que quieres borrar toda la conversación?")) {
      setMessages([]);
    }
  };

  if (!agent) {
    return null;
  }

  const colorClasses = {
    cyan: "border-cyan-500/20 bg-cyan-500/5",
    purple: "border-purple-500/20 bg-purple-500/5",
    emerald: "border-emerald-500/20 bg-emerald-500/5",
    amber: "border-amber-500/20 bg-amber-500/5",
    rose: "border-rose-500/20 bg-rose-500/5",
    blue: "border-blue-500/20 bg-blue-500/5",
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header
        className={cn(
          "sticky top-0 z-10 flex items-center gap-4 border-b p-4 backdrop-blur-sm",
          colorClasses[agent.color as keyof typeof colorClasses]
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background/50 backdrop-blur-sm shrink-0">
            <Bot className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-lg truncate">{agent.name}</h1>
            <p className="text-xs text-muted-foreground truncate">{agent.model}</p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleClearChat} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Borrar conversación
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <div className="mb-4 rounded-full bg-muted p-6">
                <Bot className="h-12 w-12 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">
                Conversa con {agent.name}
              </h2>
              <p className="text-muted-foreground max-w-md">
                {agent.description}. Escribe tu mensaje abajo para comenzar.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                agentColor={agent.color}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur-sm p-4">
        <div className="max-w-4xl mx-auto">
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={isLoading}
            placeholder={`Envía un mensaje a ${agent.name}...`}
          />
        </div>
      </div>
    </div>
  );
}
