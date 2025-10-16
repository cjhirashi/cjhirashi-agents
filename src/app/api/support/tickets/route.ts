import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { TicketCategory, TicketPriority, TicketStatus } from "@prisma/client";
import { generateAISupportResponse, canAIResolve } from "@/lib/support-ai";

// Función para generar número de ticket único
async function generateTicketNumber(): Promise<string> {
  const prefix = "TICK";
  let isUnique = false;
  let ticketNumber = "";

  while (!isUnique) {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    ticketNumber = `${prefix}-${randomNum}`;

    const existing = await prisma.supportTicket.findUnique({
      where: { ticketNumber },
    });

    if (!existing) {
      isUnique = true;
    }
  }

  return ticketNumber;
}

// GET /api/support/tickets - Listar tickets del usuario o todos (admin)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const isAdmin = session.user.role === "ADMIN";

    // Construir filtros
    const where: any = {};

    if (!isAdmin) {
      // Usuarios normales solo ven sus propios tickets
      where.userId = session.user.id;
    }

    if (status) {
      where.status = status as TicketStatus;
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1, // Solo el último mensaje
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}

// POST /api/support/tickets - Crear un nuevo ticket
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, category, priority, metadata } = body;

    // Validaciones
    if (!title || !description || !category) {
      return NextResponse.json(
        { error: "Title, description, and category are required" },
        { status: 400 }
      );
    }

    // Generar número de ticket único
    const ticketNumber = await generateTicketNumber();

    // Crear el ticket
    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        title,
        description,
        category: category as TicketCategory,
        priority: (priority as TicketPriority) || TicketPriority.MEDIUM,
        userId: session.user.id,
        metadata: metadata || {},
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // Generar respuesta automática de IA
    try {
      const [aiSuggestion, canResolve] = await Promise.all([
        generateAISupportResponse(title, description, category),
        canAIResolve(title, description, category),
      ]);

      if (aiSuggestion) {
        // Actualizar el ticket con la sugerencia de la IA
        await prisma.supportTicket.update({
          where: { id: ticket.id },
          data: {
            aiSuggestion,
            aiResolved: canResolve,
          },
        });

        // Crear el mensaje de IA automáticamente
        await prisma.supportMessage.create({
          data: {
            ticketId: ticket.id,
            content: aiSuggestion,
            isStaff: false,
            isAI: true,
            authorId: null,
          },
        });
      }
    } catch (aiError) {
      console.error("Error generating AI response:", aiError);
      // No fallar la creación del ticket si falla la IA
    }

    // Recargar el ticket con los mensajes
    const updatedTicket = await prisma.supportTicket.findUnique({
      where: { id: ticket.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    return NextResponse.json({
      ticket: updatedTicket,
      message: "Ticket created successfully",
    });
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json(
      { error: "Failed to create ticket" },
      { status: 500 }
    );
  }
}

// PATCH /api/support/tickets - Actualizar un ticket (solo admin)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { ticketId, status, priority, assignedToId } = body;

    if (!ticketId) {
      return NextResponse.json(
        { error: "Ticket ID is required" },
        { status: 400 }
      );
    }

    // Construir datos de actualización
    const updateData: any = {};

    if (status !== undefined) {
      updateData.status = status as TicketStatus;

      // Si se marca como resuelto, guardar la fecha
      if (status === TicketStatus.RESOLVED) {
        updateData.resolvedAt = new Date();
      }

      // Si se cierra, guardar la fecha
      if (status === TicketStatus.CLOSED) {
        updateData.closedAt = new Date();
      }
    }

    if (priority !== undefined) {
      updateData.priority = priority as TicketPriority;
    }

    if (assignedToId !== undefined) {
      updateData.assignedToId = assignedToId === null ? null : assignedToId;

      // Si se asigna, cambiar estado a IN_PROGRESS
      if (assignedToId && updateData.status === undefined) {
        updateData.status = TicketStatus.IN_PROGRESS;
      }
    }

    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      ticket,
      message: "Ticket updated successfully",
    });
  } catch (error) {
    console.error("Error updating ticket:", error);
    return NextResponse.json(
      { error: "Failed to update ticket" },
      { status: 500 }
    );
  }
}
