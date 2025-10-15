import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const initialModels = [
  {
    name: "gpt-4",
    displayName: "GPT-4",
    description: "Modelo más capaz de OpenAI, ideal para tareas complejas",
    provider: "openai",
  },
  {
    name: "gpt-4-turbo",
    displayName: "GPT-4 Turbo",
    description: "Versión optimizada y más rápida de GPT-4",
    provider: "openai",
  },
  {
    name: "gpt-3.5-turbo",
    displayName: "GPT-3.5 Turbo",
    description: "Modelo rápido y económico para tareas generales",
    provider: "openai",
  },
  {
    name: "claude-3-opus",
    displayName: "Claude 3 Opus",
    description: "Modelo más potente de Anthropic",
    provider: "anthropic",
  },
  {
    name: "claude-3-sonnet",
    displayName: "Claude 3 Sonnet",
    description: "Balance perfecto entre capacidad y velocidad",
    provider: "anthropic",
  },
  {
    name: "claude-3-haiku",
    displayName: "Claude 3 Haiku",
    description: "Modelo rápido y eficiente de Anthropic",
    provider: "anthropic",
  },
  {
    name: "gemini-pro",
    displayName: "Gemini Pro",
    description: "Modelo avanzado de Google",
    provider: "google",
  },
  {
    name: "gemini-ultra",
    displayName: "Gemini Ultra",
    description: "Modelo más capaz de Google",
    provider: "google",
  },
];

async function seedModels() {
  try {
    console.log("🌱 Sembrando modelos de IA...");

    for (const model of initialModels) {
      const existing = await prisma.aIModel.findUnique({
        where: { name: model.name },
      });

      if (existing) {
        console.log(`⏭️  Modelo "${model.displayName}" ya existe`);
        continue;
      }

      await prisma.aIModel.create({
        data: model,
      });

      console.log(`✅ Creado: ${model.displayName}`);
    }

    console.log("\n✨ Modelos sembrados exitosamente!");
  } catch (error) {
    console.error("❌ Error al sembrar modelos:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedModels();
