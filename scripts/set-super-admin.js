const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error('❌ Debes proporcionar un email');
    console.log('Uso: node scripts/set-super-admin.js <email>');
    process.exit(1);
  }

  const user = await prisma.user.update({
    where: { email },
    data: { role: 'SUPER_ADMIN' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  console.log('✅ Usuario actualizado a SUPER_ADMIN:');
  console.log(JSON.stringify(user, null, 2));
}

main()
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
