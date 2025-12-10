import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";

export async function createTestUser(data: {
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  roles?: string[];
}) {
  const passwordHash = await hashPassword(data.password || "TestPassword123");

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      firstName: data.firstName || "Test",
      lastName: data.lastName || "User",
      roles: {
        create: data.roles?.map((roleName) => ({
          role: {
            connectOrCreate: {
              where: { name: roleName },
              create: {
                name: roleName,
                description: `${roleName} role`,
                permissions: [],
              },
            },
          },
        })) || [
          {
            role: {
              connectOrCreate: {
                where: { name: "LEARNER" },
                create: {
                  name: "LEARNER",
                  description: "Learner role",
                  permissions: [],
                },
              },
            },
          },
        ],
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

  return user;
}

export async function cleanupDatabase() {
  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: "test-",
      },
    },
  });
}

export function authenticateRequest(request: Request, token: string): Request {
  const headers = new Headers(request.headers);
  headers.set("Cookie", `accessToken=${token}`);
  return new Request(request.url, {
    method: request.method,
    headers,
    body: request.body,
  });
}

