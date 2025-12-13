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

  // Create realistic groups
  const salesGroup = await prisma.group.upsert({
    where: { name: "Sales Team" },
    update: {},
    create: {
      name: "Sales Team",
      type: "STAFF",
      description: "Sales and business development team",
    },
  });

  const engineeringGroup = await prisma.group.upsert({
    where: { name: "Engineering Team" },
    update: {},
    create: {
      name: "Engineering Team",
      type: "STAFF",
      description: "Software engineering and development team",
    },
  });

  const marketingGroup = await prisma.group.upsert({
    where: { name: "Marketing Team" },
    update: {},
    create: {
      name: "Marketing Team",
      type: "STAFF",
      description: "Marketing and communications team",
    },
  });

  const managementGroup = await prisma.group.upsert({
    where: { name: "Management" },
    update: {},
    create: {
      name: "Management",
      type: "STAFF",
      description: "Management and leadership team",
    },
  });

  const newHiresGroup = await prisma.group.upsert({
    where: { name: "New Hires" },
    update: {},
    create: {
      name: "New Hires",
      type: "CUSTOM",
      description: "New employee onboarding group",
    },
  });

  // Create additional learners for group assignments
  const learner2Password = await bcrypt.hash("learner123", 10);
  const learner2 = await prisma.user.upsert({
    where: { email: "learner2@lms.com" },
    update: {
      passwordHash: learner2Password,
      emailVerified: true,
    },
    create: {
      email: "learner2@lms.com",
      passwordHash: learner2Password,
      firstName: "Jane",
      lastName: "Smith",
      emailVerified: true,
      roles: {
        create: {
          roleId: learnerRole.id,
        },
      },
    },
  });

  const learner3Password = await bcrypt.hash("learner123", 10);
  const learner3 = await prisma.user.upsert({
    where: { email: "learner3@lms.com" },
    update: {
      passwordHash: learner3Password,
      emailVerified: true,
    },
    create: {
      email: "learner3@lms.com",
      passwordHash: learner3Password,
      firstName: "Bob",
      lastName: "Johnson",
      emailVerified: true,
      roles: {
        create: {
          roleId: learnerRole.id,
        },
      },
    },
  });

  const learner4Password = await bcrypt.hash("learner123", 10);
  const learner4 = await prisma.user.upsert({
    where: { email: "learner4@lms.com" },
    update: {
      passwordHash: learner4Password,
      emailVerified: true,
    },
    create: {
      email: "learner4@lms.com",
      passwordHash: learner4Password,
      firstName: "Alice",
      lastName: "Williams",
      emailVerified: true,
      roles: {
        create: {
          roleId: learnerRole.id,
        },
      },
    },
  });

  const learner5Password = await bcrypt.hash("learner123", 10);
  const learner5 = await prisma.user.upsert({
    where: { email: "learner5@lms.com" },
    update: {
      passwordHash: learner5Password,
      emailVerified: true,
    },
    create: {
      email: "learner5@lms.com",
      passwordHash: learner5Password,
      firstName: "Charlie",
      lastName: "Brown",
      emailVerified: true,
      roles: {
        create: {
          roleId: learnerRole.id,
        },
      },
    },
  });

  // Assign learners to groups
  // Remove any existing group memberships for these users first
  await prisma.groupMember.deleteMany({
    where: {
      userId: { in: [learner.id, learner2.id, learner3.id, learner4.id, learner5.id] },
    },
  });

  // Assign learners to various groups
  await prisma.groupMember.createMany({
    data: [
      { userId: learner.id, groupId: salesGroup.id },
      { userId: learner.id, groupId: newHiresGroup.id },
      { userId: learner2.id, groupId: engineeringGroup.id },
      { userId: learner2.id, groupId: newHiresGroup.id },
      { userId: learner3.id, groupId: marketingGroup.id },
      { userId: learner4.id, groupId: engineeringGroup.id },
      { userId: learner4.id, groupId: managementGroup.id },
      { userId: learner5.id, groupId: salesGroup.id },
    ],
    skipDuplicates: true,
  });

  console.log("Seed data created:", {
    roles: [learnerRole.name, instructorRole.name, adminRole.name],
    users: [admin.email, instructor.email, learner.email, learner2.email, learner3.email, learner4.email, learner5.email],
    groups: [salesGroup.name, engineeringGroup.name, marketingGroup.name, managementGroup.name, newHiresGroup.name],
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

