import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-utils";
import { UserRole } from "@prisma/client";
import logger from "@/lib/logging/logger";

// GET /api/admin/users - List all users
export async function GET() {
  try {
    await requireAdmin();

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        agentPermissions: {
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    logger.error("Error fetching users", {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch users" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 }
    );
  }
}

// POST /api/admin/users - Update user (role, active status)
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { userId, role, isActive } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const updateData: { role?: UserRole; isActive?: boolean } = {};
    if (role !== undefined) updateData.role = role as UserRole;
    if (isActive !== undefined) updateData.isActive = isActive;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    logger.error("Error updating user", {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update user" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 }
    );
  }
}

// DELETE /api/admin/users - Delete user (GDPR compliance)
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await requireAdmin();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // No permitir eliminar al propio usuario que está ejecutando la acción
    if (currentUser.id === userId) {
      return NextResponse.json(
        { error: "Cannot delete your own account from admin panel" },
        { status: 400 }
      );
    }

    // Eliminar el usuario (las relaciones en cascade se encargan del resto)
    // Prisma eliminará automáticamente:
    // - Accounts
    // - Sessions
    // - ChatSessions y sus Conversations/Messages
    // - AgentPermissions
    // - Invitations enviadas
    // - Agents creados (esto eliminará también sus conversaciones)
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      success: true,
      message: `User ${user.email} and all associated data has been permanently deleted`,
      deletedUser: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    logger.error("Error deleting user", {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete user" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 }
    );
  }
}
