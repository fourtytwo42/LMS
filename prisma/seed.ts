import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create default roles
  const learnerRole = await prisma.role.upsert({
    where: { name: "LEARNER" },
    update: {},
    create: {
      name: "LEARNER",
      description: "Learner role",
      permissions: [
        "course:view",
        "enrollment:self",
        "progress:view:own",
        "test:take",
        "file:download",
      ],
    },
  });

  const instructorRole = await prisma.role.upsert({
    where: { name: "INSTRUCTOR" },
    update: {},
    create: {
      name: "INSTRUCTOR",
      description: "Instructor role",
      permissions: [
        "course:create",
        "course:edit:own",
        "course:view",
        "enrollment:create",
        "analytics:view:own",
        "test:create",
        "test:edit:own",
        "file:upload",
      ],
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: {
      name: "ADMIN",
      description: "Administrator role",
      permissions: ["*"], // All permissions
    },
  });

  // Create demo users for all roles
  const adminPassword = await bcrypt.hash("admin123", 10);
  const instructorPassword = await bcrypt.hash("instructor123", 10);
  const learnerPassword = await bcrypt.hash("learner123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@lms.com" },
    update: {
      passwordHash: adminPassword,
      emailVerified: true,
    },
    create: {
      email: "admin@lms.com",
      passwordHash: adminPassword,
      firstName: "Admin",
      lastName: "User",
      emailVerified: true,
      roles: {
        create: {
          roleId: adminRole.id,
        },
      },
    },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });
  
  // Ensure admin has ADMIN role (in case user existed without role)
  const adminHasRole = admin.roles.some(ur => ur.role.name === "ADMIN");
  if (!adminHasRole) {
    await prisma.userRole.create({
      data: {
        userId: admin.id,
        roleId: adminRole.id,
      },
    });
  }

  const instructor = await prisma.user.upsert({
    where: { email: "instructor@lms.com" },
    update: {
      passwordHash: instructorPassword,
      emailVerified: true,
    },
    create: {
      email: "instructor@lms.com",
      passwordHash: instructorPassword,
      firstName: "Instructor",
      lastName: "Demo",
      emailVerified: true,
      roles: {
        create: {
          roleId: instructorRole.id,
        },
      },
    },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });
  
  // Ensure instructor has INSTRUCTOR role
  const instructorHasRole = instructor.roles.some(ur => ur.role.name === "INSTRUCTOR");
  if (!instructorHasRole) {
    await prisma.userRole.create({
      data: {
        userId: instructor.id,
        roleId: instructorRole.id,
      },
    });
  }

  const learner = await prisma.user.upsert({
    where: { email: "learner@lms.com" },
    update: {
      passwordHash: learnerPassword,
      emailVerified: true,
    },
    create: {
      email: "learner@lms.com",
      passwordHash: learnerPassword,
      firstName: "Learner",
      lastName: "Demo",
      emailVerified: true,
      roles: {
        create: {
          roleId: learnerRole.id,
        },
      },
    },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });
  
  // Ensure learner has LEARNER role
  const learnerHasRole = learner.roles.some(ur => ur.role.name === "LEARNER");
  if (!learnerHasRole) {
    await prisma.userRole.create({
      data: {
        userId: learner.id,
        roleId: learnerRole.id,
      },
    });
  }

  console.log("Seed data created:", {
    roles: [learnerRole.name, instructorRole.name, adminRole.name],
    users: [admin.email, instructor.email, learner.email],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

