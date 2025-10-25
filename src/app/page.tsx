import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, MessageSquare, Shield, Zap } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="container max-w-6xl">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="flex justify-center mb-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-white shadow-lg">
                <Bot className="h-10 w-10" />
              </div>
            </div>
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              cjhirashi-agents
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Multi-agent AI platform with RAG and real-time chat
            </p>

            <div className="flex gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
              <Button variant="outline" asChild size="lg">
                <Link href="/auth/signin">Login</Link>
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="glass-card">
              <CardHeader>
                <MessageSquare className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Real-time Chat</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Stream responses with Server-Sent Events
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <Bot className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Multi-Agent</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Specialized AI agents for different tasks
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <Zap className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>RAG Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Semantic search with Pinecone vector DB
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <Shield className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Secure</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  NextAuth v5 with RBAC and rate limiting
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Construido con ❤️ por Carlos Jiménez Hirashi
        </div>
      </footer>
    </div>
  );
}