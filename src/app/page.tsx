import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-2xl">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Hub de Agentes IA
          </h1>
          <p className="text-xl text-muted-foreground">
            Interfaz elegante para interactuar con agentes multimodales
            desarrollados con ADK de Google
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity">
              Comenzar
            </button>
            <button className="px-6 py-3 border border-white/10 rounded-lg font-semibold hover:bg-white/5 transition-colors">
              Documentación
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Construido con ❤️ por Carlos Jiménez Hirashi
        </div>
      </footer>
    </div>
  );
}