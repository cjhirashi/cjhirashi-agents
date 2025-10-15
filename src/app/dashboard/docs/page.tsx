import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, BookOpen, Code, Lightbulb } from "lucide-react";

const docSections = [
  {
    title: "Introducción",
    description: "Aprende los conceptos básicos de cjhirashi agents",
    icon: BookOpen,
    href: "#intro",
  },
  {
    title: "Guía de Uso",
    description: "Cómo interactuar con los agentes de manera efectiva",
    icon: Lightbulb,
    href: "#guide",
  },
  {
    title: "API Reference",
    description: "Documentación técnica para desarrolladores",
    icon: Code,
    href: "#api",
  },
];

export default function DocsPage() {
  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documentación</h1>
        <p className="text-muted-foreground mt-2">
          Guías y recursos para aprovechar al máximo tus agentes
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {docSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title} className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                </div>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documentación en desarrollo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            La documentación completa estará disponible próximamente. Por ahora, explora los agentes
            disponibles y experimenta con sus capacidades.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
