import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-utils";
import { UserRole, SubscriptionTier } from "@prisma/client";
import logger from "@/lib/logging/logger";
import bcrypt from "bcryptjs";

/**
 * POST /api/admin/users/create - Create new user directly
 *
 * Body:
 * {
 *   email: string;
 *   name: string;
 *   password: string;
 *   role: UserRole;
 *   subscriptionTier: SubscriptionTier;
 * }
 *
 * Returns:
 * {
 *   user: User
 * }
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { email, name, password, role, subscriptionTier } = body;

    // Validation
    if (!email || !name || !password || !role || !subscriptionTier) {
      return NextResponse.json(
        { error: "Missing required fields: email, name, password, role, subscriptionTier" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword, // Store hashed password in User model
        role: role as UserRole,
        subscriptionTier: subscriptionTier as SubscriptionTier,
        isActive: true,
        emailVerified: new Date(), // Auto-verify admin-created users
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        subscriptionTier: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info("User created by admin", {
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    logger.error("Error creating user", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create user" },
      {
        status:
          error instanceof Error && error.message.includes("Unauthorized")
            ? 403
            : 500,
      }
    );
  }
}
