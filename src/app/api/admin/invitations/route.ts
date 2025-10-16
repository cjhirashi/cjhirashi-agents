import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { UserRole, InvitationStatus } from "@prisma/client";
import crypto from "crypto";

// GET /api/admin/invitations - List all invitations
export async function GET() {
  try {
    await requireAdmin();

    const invitations = await prisma.invitation.findMany({
      include: {
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch invitations" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 }
    );
  }
}

// POST /api/admin/invitations - Create a new invitation
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { email, role = "USER" } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Verificar si ya existe una invitación pendiente
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        status: InvitationStatus.PENDING,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (existingInvitation) {
      return NextResponse.json(
        { error: "There is already a pending invitation for this email" },
        { status: 400 }
      );
    }

    // Generar token único
    const token = crypto.randomBytes(32).toString("hex");

    // Crear invitación (expira en 7 días)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await prisma.invitation.create({
      data: {
        email,
        token,
        role: role as UserRole,
        invitedBy: session.user.id,
        expiresAt,
      },
      include: {
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // TODO: Aquí se enviaría el email con el enlace de invitación
    // const invitationUrl = `${process.env.NEXTAUTH_URL}/auth/accept-invitation?token=${token}`;
    // await sendInvitationEmail(email, invitationUrl, invitation.inviter.name);

    return NextResponse.json({
      invitation,
      message: "Invitation created successfully",
    });
  } catch (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create invitation" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 }
    );
  }
}

// DELETE /api/admin/invitations - Cancel an invitation
export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get("id");

    if (!invitationId) {
      return NextResponse.json({ error: "Invitation ID is required" }, { status: 400 });
    }

    // Verificar que la invitación existe
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    // Actualizar el status a CANCELLED en lugar de eliminar
    const updatedInvitation = await prisma.invitation.update({
      where: { id: invitationId },
      data: {
        status: InvitationStatus.CANCELLED,
      },
    });

    return NextResponse.json({
      invitation: updatedInvitation,
      message: "Invitation cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling invitation:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to cancel invitation" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 }
    );
  }
}
