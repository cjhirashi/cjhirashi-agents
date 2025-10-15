"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Chrome } from "lucide-react";

export default function SignInPage() {
  const handleGoogleSignIn = async () => {
    await signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Bot className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl">Bienvenido a CJHIRASHI Agents</CardTitle>
            <CardDescription className="mt-2">
              Inicia sesión para acceder a tus agentes de IA
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleGoogleSignIn}
            className="w-full"
            size="lg"
            variant="outline"
          >
            <Chrome className="mr-2 h-5 w-5" />
            Continuar con Google
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Al continuar, aceptas nuestros términos de servicio y política de privacidad
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
