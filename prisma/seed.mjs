import { loadEnvFile } from "node:process";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

try {
  loadEnvFile(".env");
} catch {
  // DATABASE_URL may be supplied by the environment.
}

const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

const eventId = "event-17-agustus";
const adminId = "admin-primary";

const sessionTeams = [
  ["A1", "A2", "B1", "B2", "C1", "D1"],
  ["C2", "C3", "D2", "D3", "A3", "B3"],
  ["A4", "A5", "B4", "B5", "C4", "D4"],
  ["C5", "C6", "D5", "D6", "A6", "B6"],
];

const groupColors = {
  A: "#dc2626",
  B: "#173a63",
  C: "#16a34a",
  D: "#f59e0b",
};

async function main() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const email = process.env.ADMIN_EMAIL || "admin@example.com";
  const password = process.env.ADMIN_PASSWORD || "admin12345";
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.adminUser.upsert({
    where: { id: adminId },
    update: {
      name: "Admin Operator",
      username,
      email,
      passwordHash,
      isActive: true,
    },
    create: {
      id: adminId,
      name: "Admin Operator",
      username,
      email,
      passwordHash,
      isActive: true,
    },
  });

  await prisma.event.deleteMany({
    where: { id: eventId },
  });

  await prisma.event.create({
    data: {
      id: eventId,
      name: "Perlombaan HUT RI Ke-81",
      status: "LIVE",
      competitionState: {
        create: {
          stage: "PRELIMINARY",
          currentQuestion: 1,
        },
      },
      teams: {
        create: sessionTeams.flatMap((teams, sessionIndex) =>
          teams.map((name, teamIndex) => ({
            id: `preliminary-${name.toLowerCase()}`,
            name,
            bannerColor: groupColors[name[0]],
            preliminarySession: sessionIndex + 1,
            displayOrder: teamIndex + 1,
          })),
        ),
      },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
