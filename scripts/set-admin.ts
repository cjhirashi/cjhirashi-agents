import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function setAdmin(email: string) {
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role: UserRole.ADMIN },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    console.log("✅ Usuario actualizado a ADMIN:", user);
  } catch (error) {
    console.error("❌ Error al actualizar usuario:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.error("❌ Por favor proporciona un email");
  console.log("Uso: npm run set-admin <email>");
  process.exit(1);
}

setAdmin(email);
