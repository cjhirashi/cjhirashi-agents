import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, User, Bell, Palette, Shield } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const settingsSections = [
  {
    title: "Perfil",
    description: "Gestiona tu información personal",
    icon: User,
  },
  {
    title: "Notificaciones",
    description: "Configura tus preferencias de notificaciones",
    icon: Bell,
  },
  {
    title: "Apariencia",
    description: "Personaliza el tema y la interfaz",
    icon: Palette,
  },
  {
    title: "Privacidad y Seguridad",
    description: "Controla tu privacidad y seguridad",
    icon: Shield,
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ajustes</h1>
        <p className="text-muted-foreground mt-2">
          Configura tu experiencia con cjhirashi agents
        </p>
      </div>

      <div className="space-y-4">
        {settingsSections.map((section, idx) => {
          const Icon = section.icon;
          return (
            <div key={section.title}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-lg">{section.title}</CardTitle>
                        <CardDescription className="mt-1">{section.description}</CardDescription>
                      </div>
                    </div>
                    <Settings className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
              </Card>
              {idx < settingsSections.length - 1 && <Separator className="my-4" />}
            </div>
          );
        })}
      </div>

      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="text-sm">Próximamente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Las opciones de configuración estarán disponibles cuando se implemente el sistema de
            autenticación y preferencias de usuario.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
