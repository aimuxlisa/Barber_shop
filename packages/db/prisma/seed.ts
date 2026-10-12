import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "../src/generated/client";

config({ path: resolve(__dirname, "../../../.env") });

const prisma = new PrismaClient();

const SERVICE_IDS = {
  cut: "11111111-1111-4111-8111-111111111111",
  fade: "22222222-2222-4222-8222-222222222222",
  beard: "33333333-3333-4333-8333-333333333333",
  shave: "44444444-4444-4444-8444-444444444444",
  full: "55555555-5555-4555-8555-555555555555",
} as const;

const BARBER_IDS = {
  aziz: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  timur: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  leo: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  david: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
} as const;

const services = [
  {
    id: SERVICE_IDS.cut,
    name: "Classic cut",
    description:
      "A measured shape for the way you actually live. Scissors, weight, and a clean neckline.",
    durationMin: 45,
    price: 120_000,
    sortOrder: 1,
  },
  {
    id: SERVICE_IDS.fade,
    name: "Signature fade",
    description: "A tight graduation that stays sharp for the week, not just the photograph.",
    durationMin: 50,
    price: 140_000,
    sortOrder: 2,
  },
  {
    id: SERVICE_IDS.beard,
    name: "Beard design",
    description: "Line, length, and density. The jaw is drawn, not decorated.",
    durationMin: 30,
    price: 80_000,
    sortOrder: 3,
  },
  {
    id: SERVICE_IDS.shave,
    name: "Royal shave",
    description: "Hot linen, a slow pass, and time enough to leave the street outside.",
    durationMin: 40,
    price: 90_000,
    sortOrder: 4,
  },
  {
    id: SERVICE_IDS.full,
    name: "Full grooming",
    description: "Cut, beard, and shave in one sitting. The chair is yours until it is finished.",
    durationMin: 90,
    price: 220_000,
    sortOrder: 5,
  },
];

const barbers = [
  {
    id: BARBER_IDS.aziz,
    name: "Aziz Karimov",
    photoUrl: "/images/barber-1.jpg",
    bio: "Classic cut. Scissors work with a clean neckline.",
    experienceYears: 8,
    sortOrder: 1,
  },
  {
    id: BARBER_IDS.timur,
    name: "Timur Yusupov",
    photoUrl: "/images/barber-2.jpg",
    bio: "Signature fade. Tight graduation that holds through the week.",
    experienceYears: 6,
    sortOrder: 2,
  },
  {
    id: BARBER_IDS.leo,
    name: "Leo Marchetti",
    photoUrl: "/images/barber-3.jpg",
    bio: "Royal shave. Hot linen and a slow, precise pass.",
    experienceYears: 11,
    sortOrder: 3,
  },
  {
    id: BARBER_IDS.david,
    name: "David Petrosyan",
    photoUrl: "/images/barber-4.jpg",
    bio: "Beard design. Line, length, and density.",
    experienceYears: 9,
    sortOrder: 4,
  },
];

/** ISO weekday: 1 = Monday … 7 = Sunday. Shop is closed on Monday. */
const OPEN_WEEKDAYS = [2, 3, 4, 5, 6, 7];

const settings = [
  { key: "cancel_cutoff_min", value: "30" },
  { key: "slot_step_min", value: "15" },
  { key: "booking_horizon_days", value: "30" },
  { key: "min_notice_min", value: "30" },
  { key: "reminder_day_minutes", value: "1440" },
  { key: "reminder_short_minutes", value: "30" },
  { key: "review_delay_min", value: "60" },
  { key: "timezone", value: "Asia/Tashkent" },
  { key: "review_public_min_rating", value: "4" },
];

async function main() {
  for (const service of services) {
    await prisma.service.upsert({
      where: { id: service.id },
      update: service,
      create: service,
    });
  }

  for (const barber of barbers) {
    await prisma.barber.upsert({
      where: { id: barber.id },
      update: barber,
      create: barber,
    });
  }

  for (const barber of barbers) {
    for (const service of services) {
      await prisma.barberService.upsert({
        where: {
          barberId_serviceId: { barberId: barber.id, serviceId: service.id },
        },
        update: { isEnabled: true, durationMin: null, price: null },
        create: {
          barberId: barber.id,
          serviceId: service.id,
          isEnabled: true,
        },
      });
    }

    await prisma.workingHours.deleteMany({ where: { barberId: barber.id } });
    await prisma.break.deleteMany({ where: { barberId: barber.id } });

    for (const weekday of OPEN_WEEKDAYS) {
      await prisma.workingHours.create({
        data: {
          barberId: barber.id,
          weekday,
          startTime: new Date("1970-01-01T11:00:00.000Z"),
          endTime: new Date("1970-01-01T21:00:00.000Z"),
        },
      });

      await prisma.break.create({
        data: {
          barberId: barber.id,
          weekday,
          startTime: new Date("1970-01-01T15:00:00.000Z"),
          endTime: new Date("1970-01-01T16:00:00.000Z"),
        },
      });
    }
  }

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  await prisma.adminUser.upsert({
    where: { login: "admin" },
    update: {},
    create: {
      login: "admin",
      passwordHash: "REPLACE_WITH_ARGON2_IN_STAGE_4",
    },
  });

  const counts = {
    services: await prisma.service.count(),
    barbers: await prisma.barber.count(),
    workingHours: await prisma.workingHours.count(),
    settings: await prisma.setting.count(),
  };

  console.log("Seed complete:", counts);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
