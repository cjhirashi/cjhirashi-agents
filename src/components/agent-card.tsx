"use client";

import Link from "next/link";
import { Bot, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface Agent {
  id: string;
  name: string;
  description: string;
  model: string;
  icon?: string;
  color?: string;
  tags?: string[];
}

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  const { id, name, description, model, color = "cyan", tags = [] } = agent;

  const colorClasses = {
    cyan: "from-cyan-500/10 to-cyan-500/5 border-cyan-500/20 hover:border-cyan-500/40",
    purple: "from-purple-500/10 to-purple-500/5 border-purple-500/20 hover:border-purple-500/40",
    emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40",
    amber: "from-amber-500/10 to-amber-500/5 border-amber-500/20 hover:border-amber-500/40",
    rose: "from-rose-500/10 to-rose-500/5 border-rose-500/20 hover:border-rose-500/40",
    blue: "from-blue-500/10 to-blue-500/5 border-blue-500/20 hover:border-blue-500/40",
  };

  const iconColorClasses = {
    cyan: "text-cyan-500",
    purple: "text-purple-500",
    emerald: "text-emerald-500",
    amber: "text-amber-500",
    rose: "text-rose-500",
    blue: "text-blue-500",
  };

  return (
    <Link href={`/chat/${id}`} className="group">
      <Card
        className={cn(
          "relative h-full overflow-hidden transition-all duration-300",
          "bg-gradient-to-br hover:scale-[1.02] hover:shadow-lg",
          colorClasses[color as keyof typeof colorClasses] || colorClasses.cyan
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg bg-background/50 backdrop-blur-sm",
                "transition-transform duration-300 group-hover:scale-110"
              )}>
                <Bot className={cn("h-5 w-5", iconColorClasses[color as keyof typeof iconColorClasses])} />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">{name}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{model}</p>
              </div>
            </div>
            <Sparkles className={cn(
              "h-4 w-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100",
              iconColorClasses[color as keyof typeof iconColorClasses]
            )} />
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <CardDescription className="line-clamp-2 text-sm">
            {description}
          </CardDescription>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-background/50 px-2 py-0.5 text-xs font-medium backdrop-blur-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </CardContent>

        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-br from-background/50 to-transparent" />
      </Card>
    </Link>
  );
}
