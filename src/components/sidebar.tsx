"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  MessageSquare,
  History,
  Settings,
  FileText,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

const navigationItems = [
  {
    title: "Principal",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Agentes", href: "/dashboard/agents", icon: Bot },
      { name: "Conversaciones", href: "/dashboard/conversations", icon: MessageSquare },
    ],
  },
  {
    title: "Historial",
    items: [
      { name: "Mis Chats", href: "/dashboard/history", icon: History },
    ],
  },
  {
    title: "Configuración",
    items: [
      { name: "Documentación", href: "/dashboard/docs", icon: FileText },
      { name: "Ajustes", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "relative flex h-screen flex-col border-r bg-background transition-all duration-300",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Logo / Brand */}
      <div className="flex h-16 items-center border-b px-4">
        {!collapsed ? (
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <span className="text-lg">🤖</span>
            </div>
            <span className="font-semibold">cjhirashi agents</span>
          </Link>
        ) : (
          <Link href="/dashboard" className="flex items-center justify-center w-full">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <span className="text-lg">🤖</span>
            </div>
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto p-4">
        {navigationItems.map((section, idx) => (
          <div key={section.title}>
            {!collapsed && (
              <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </h3>
            )}
            {collapsed && idx > 0 && <Separator className="my-2" />}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      collapsed && "justify-center"
                    )}
                    title={collapsed ? item.name : undefined}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse Toggle Button */}
      <div className="border-t p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn("w-full", collapsed && "px-2")}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5 mr-2" />
              <span className="text-sm">Contraer</span>
            </>
          )}
        </Button>
      </div>

      {/* User Section - Placeholder for future auth */}
      {!collapsed && (
        <div className="border-t p-4">
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500" />
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">Carlos Hirashi</p>
              <p className="truncate text-xs text-muted-foreground">cjhirashi@gmail.com</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
