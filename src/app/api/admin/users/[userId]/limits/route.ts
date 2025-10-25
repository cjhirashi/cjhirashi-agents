import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-utils";
import { SubscriptionTier, Prisma } from "@prisma/client";
import logger from "@/lib/logging/logger";

// GET /api/admin/users/[userId]/limits - Get user limits
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  try {
    await requireAdmin();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionTier: true,
        customLimits: true,
        monthlyMessages: true,
        monthlyTokens: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        ...user,
        monthlyTokens: user.monthlyTokens.toString(),
      }
    });
  } catch (error) {
    logger.error("Error fetching user limits", {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch user limits" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 }
    );
  }
}

// PATCH /api/admin/users/[userId]/limits - Update user limits
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  try {
    await requireAdmin();

    const body = await request.json();
    const { subscriptionTier, monthlyMessageLimit, monthlyTokenLimit } = body;

    // Validar que el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Construir el objeto de actualización
    const updateData: {
      subscriptionTier?: SubscriptionTier;
      customLimits?: Prisma.InputJsonValue;
    } = {};

    if (subscriptionTier !== undefined) {
      updateData.subscriptionTier = subscriptionTier as SubscriptionTier;
    }

    // Actualizar customLimits con los nuevos valores
    const currentLimits = (existingUser.customLimits as Record<string, unknown>) || {};
    const newCustomLimits = { ...currentLimits };

    if (monthlyMessageLimit !== undefined) {
      newCustomLimits.monthlyMessageLimit = monthlyMessageLimit === null ? null : parseInt(monthlyMessageLimit);
    }

    if (monthlyTokenLimit !== undefined) {
      newCustomLimits.monthlyTokenLimit = monthlyTokenLimit === null ? null : monthlyTokenLimit;
    }

    updateData.customLimits = newCustomLimits as Prisma.InputJsonValue;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionTier: true,
        customLimits: true,
        monthlyMessages: true,
        monthlyTokens: true,
      },
    });

    return NextResponse.json({
      user: {
        ...user,
        // Convertir BigInt a string para JSON
        monthlyTokens: user.monthlyTokens.toString(),
      }
    });
  } catch (error) {
    logger.error("Error updating user limits", {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update user limits" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 }
    );
  }
}
