/**
 * 管理者ユーザー作成スクリプト
 *
 * 実行方法:
 *   EMAIL=admin@example.com PASSWORD=yourpassword NAME="管理者" npx tsx scripts/create-admin.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createHash } from "crypto";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function hashPassword(password: string): string {
  // Node.js environment - use native crypto
  return createHash("sha256").update(password).digest("hex");
}

async function main() {
  const email = process.env.EMAIL;
  const password = process.env.PASSWORD;
  const name = process.env.NAME ?? "管理者";

  if (!email || !password) {
    console.error("Usage: EMAIL=... PASSWORD=... NAME=... npx tsx scripts/create-admin.ts");
    process.exit(1);
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash: hashPassword(password), role: "admin", name },
    create: { email, name, passwordHash: hashPassword(password), role: "admin" },
  });

  console.log(`Admin user created/updated: ${user.email} (id: ${user.id})`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
