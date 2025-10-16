import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-utils";
import { SubscriptionTier } from "@prisma/client";

// GET /api/admin/users/[userId]/limits - Get user limits
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    await requireAdmin();

    const user = await prisma.user.findUnique({
      where: { id: params.userId },
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
    console.error("Error fetching user limits:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch user limits" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 }
    );
  }
}

// PATCH /api/admin/users/[userId]/limits - Update user limits
export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { subscriptionTier, monthlyMessageLimit, monthlyTokenLimit } = body;

    // Validar que el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id: params.userId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Construir el objeto de actualización
    const updateData: {
      subscriptionTier?: SubscriptionTier;
      customLimits?: any;
    } = {};

    if (subscriptionTier !== undefined) {
      updateData.subscriptionTier = subscriptionTier as SubscriptionTier;
    }

    // Actualizar customLimits con los nuevos valores
    const currentLimits = existingUser.customLimits as any || {};
    const newCustomLimits = { ...currentLimits };

    if (monthlyMessageLimit !== undefined) {
      newCustomLimits.monthlyMessageLimit = monthlyMessageLimit === null ? null : parseInt(monthlyMessageLimit);
    }

    if (monthlyTokenLimit !== undefined) {
      newCustomLimits.monthlyTokenLimit = monthlyTokenLimit === null ? null : monthlyTokenLimit;
    }

    updateData.customLimits = newCustomLimits;

    const user = await prisma.user.update({
      where: { id: params.userId },
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
    console.error("Error updating user limits:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update user limits" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 }
    );
  }
}
