/**
 * One-off seed for the first platform_admins row in an environment
 * (add-platform-admin-console tasks.md 5.1). No UI creates this - it's a
 * deploy-time operational step. Usage:
 *   npx tsx scripts/seed-platform-admin.ts <email> <password>
 */
import { randomUUID } from "node:crypto";
import * as argon2 from "argon2";
import { db } from "../src/db/kysely.js";

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error("Usage: npx tsx scripts/seed-platform-admin.ts <email> <password>");
    process.exit(1);
  }

  const id = randomUUID();
  const passwordHash = await argon2.hash(password);
  await db.insertInto("platform_admins").values({ id, email, password_hash: passwordHash }).execute();

  console.log(JSON.stringify({ id, email }, null, 2));
  await db.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
