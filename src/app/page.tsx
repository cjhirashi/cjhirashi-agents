import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col ">
      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 ">
        
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