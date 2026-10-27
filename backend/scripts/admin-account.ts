/** Explicit one-off admin provisioning. No production default credentials. */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const apply = process.argv.includes('--apply');
const rotate = process.argv.includes('--rotate');
const email = (process.env.ADMIN_BOOTSTRAP_EMAIL || '').trim().toLowerCase();
const mobile = (process.env.ADMIN_BOOTSTRAP_MOBILE || '').trim();
const password = process.env.ADMIN_BOOTSTRAP_PASSWORD || '';

async function main() {
  if (!email || !/^\S+@\S+\.\S+$/.test(email) || (apply && (password.length < 12 || !mobile))) {
    throw new Error('Set ADMIN_BOOTSTRAP_EMAIL, ADMIN_BOOTSTRAP_MOBILE and a unique ADMIN_BOOTSTRAP_PASSWORD (12+ chars) before --apply');
  }
  const prisma = new PrismaClient();
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!apply) {
      console.log(`[admin] CHECK ONLY: ${existing ? `account exists, role=${existing.role}` : 'account missing'}. No writes.`);
      return;
    }
    if (existing && !['ADMIN', 'SUPER_ADMIN'].includes(existing.role)) {
      throw new Error('Email belongs to a non-admin user. Will not grant admin role to existing employee.');
    }
    if (existing && !rotate) {
      throw new Error('Admin already exists; explicitly use --apply --rotate to rotate credentials.');
    }
    const hash = await bcrypt.hash(password, 12);
    if (existing) {
      await prisma.user.update({ where: { id: existing.id }, data: { passwordHash: hash } });
      console.log('[admin] Password hash rotated. No role changes.');
    } else {
      // A unique mobile is required by the Prisma schema even for email-login admins.
      const collision = await prisma.user.findUnique({ where: { mobile } });
      if (collision) throw new Error('ADMIN_BOOTSTRAP_MOBILE is already associated with a user');
      await prisma.user.create({ data: { email, mobile, passwordHash: hash, role: 'SUPER_ADMIN', status: 'ACTIVE' } });
      console.log('[admin] SUPER_ADMIN account created. No employee or wallet records modified.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error('[admin]', error.message); process.exitCode = 1; });
