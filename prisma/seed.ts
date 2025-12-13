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

  // Create groups (delete existing first, then create fresh)
  await prisma.group.deleteMany({
    where: {
      name: { in: ["Public", "Staff"] },
    },
  });

  const publicGroup = await prisma.group.create({
    data: {
      name: "Public",
      type: "PUBLIC",
      description: "Public group for self-enrolled users",
    },
  });

  const staffGroup = await prisma.group.create({
    data: {
      name: "Staff",
      type: "STAFF",
      description: "Staff group",
    },
  });

  // Create demo users - only 4 accounts
  const adminPassword = await bcrypt.hash("admin123", 10);
  const instructorPassword = await bcrypt.hash("instructor123", 10);
  const learner1Password = await bcrypt.hash("learner123", 10);
  const learner2Password = await bcrypt.hash("learner123", 10);

  // Admin user
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

  // Ensure admin has ADMIN role
  const adminHasRole = admin.roles.some(ur => ur.role.name === "ADMIN");
  if (!adminHasRole) {
    await prisma.userRole.create({
      data: {
        userId: admin.id,
        roleId: adminRole.id,
      },
    });
  }

  // Instructor user
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

  // Learner 1 - in Public group
  const learner1 = await prisma.user.upsert({
    where: { email: "learner@lms.com" },
    update: {
      passwordHash: learner1Password,
      emailVerified: true,
    },
    create: {
      email: "learner@lms.com",
      passwordHash: learner1Password,
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

  // Ensure learner1 has LEARNER role
  const learner1HasRole = learner1.roles.some(ur => ur.role.name === "LEARNER");
  if (!learner1HasRole) {
    await prisma.userRole.create({
      data: {
        userId: learner1.id,
        roleId: learnerRole.id,
      },
    });
  }

  // Learner 2 - in Staff group
  const learner2 = await prisma.user.upsert({
    where: { email: "learner2@lms.com" },
    update: {
      passwordHash: learner2Password,
      emailVerified: true,
    },
    create: {
      email: "learner2@lms.com",
      passwordHash: learner2Password,
      firstName: "Staff",
      lastName: "Learner",
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

  // Ensure learner2 has LEARNER role
  const learner2HasRole = learner2.roles.some(ur => ur.role.name === "LEARNER");
  if (!learner2HasRole) {
    await prisma.userRole.create({
      data: {
        userId: learner2.id,
        roleId: learnerRole.id,
      },
    });
  }

  // Remove all existing group memberships for demo users
  await prisma.groupMember.deleteMany({
    where: {
      userId: { in: [learner1.id, learner2.id] },
    },
  });

  // Assign learners to groups
  await prisma.groupMember.createMany({
    data: [
      { userId: learner1.id, groupId: publicGroup.id },
      { userId: learner2.id, groupId: staffGroup.id },
    ],
    skipDuplicates: true,
  });

  // Delete all other users (except the 4 demo accounts)
  await prisma.user.deleteMany({
    where: {
      email: {
        notIn: ["admin@lms.com", "instructor@lms.com", "learner@lms.com", "learner2@lms.com"],
      },
    },
  });

  // Delete all groups except Public and Staff
  await prisma.group.deleteMany({
    where: {
      name: {
        notIn: ["Public", "Staff"],
      },
    },
  });

  console.log("Seed data created:", {
    roles: [learnerRole.name, instructorRole.name, adminRole.name],
    users: [admin.email, instructor.email, learner1.email, learner2.email],
    groups: [publicGroup.name, staffGroup.name],
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
