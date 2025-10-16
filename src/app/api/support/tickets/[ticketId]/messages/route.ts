import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { TicketStatus } from "@prisma/client";

// POST /api/support/tickets/[ticketId]/messages - Enviar un mensaje al ticket
export async function POST(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { content, isAI = false } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    // Verificar que el ticket existe
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: params.ticketId },
      select: {
        id: true,
        userId: true,
        status: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Verificar permisos
    const isOwner = ticket.userId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // No permitir mensajes en tickets cerrados o cancelados
    if (ticket.status === TicketStatus.CLOSED || ticket.status === TicketStatus.CANCELLED) {
      return NextResponse.json(
        { error: "Cannot send messages to closed or cancelled tickets" },
        { status: 400 }
      );
    }

    // Crear el mensaje
    const message = await prisma.supportMessage.create({
      data: {
        ticketId: params.ticketId,
        content,
        isStaff: isAdmin,
        isAI: isAI,
        authorId: isAI ? null : session.user.id,
      },
    });

    // Actualizar el estado del ticket si es necesario
    let newStatus = ticket.status;

    if (isAdmin && ticket.status === TicketStatus.OPEN) {
      // Si un admin responde, cambiar a IN_PROGRESS
      newStatus = TicketStatus.IN_PROGRESS;
    } else if (!isAdmin && ticket.status === TicketStatus.WAITING_USER) {
      // Si el usuario responde, cambiar a IN_PROGRESS
      newStatus = TicketStatus.IN_PROGRESS;
    } else if (isAdmin && ticket.status === TicketStatus.IN_PROGRESS) {
      // Si el admin envía un mensaje, cambiar a WAITING_USER
      newStatus = TicketStatus.WAITING_USER;
    }

    if (newStatus !== ticket.status) {
      await prisma.supportTicket.update({
        where: { id: params.ticketId },
        data: { status: newStatus },
      });
    }

    return NextResponse.json({
      message,
      success: true,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
