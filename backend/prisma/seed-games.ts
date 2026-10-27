/**
 * Workpay Patch 2 – safe, catalogue-only bootstrap for MongoDB / Prisma.
 * Check first: npm run prisma:seed:games:check
 * Apply explicitly: npm run prisma:seed:games
 * Does NOT delete existing games, change wallets, users, or overwrite operators'
 * configured game activation / URLs. Only creates missing rows.
 */
import 'dotenv/config';
import { PrismaClient, GameBadge } from '@prisma/client';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be explicitly provided for this script');
  }
  console.log(`[games] mode: ${apply ? 'APPLY' : 'CHECK ONLY (no changes)'}`);

  const categories = [
    { name: 'All Games', slug: 'all', icon: 'Sparkles', sortOrder: 0 },
    { name: 'Arcade', slug: 'arcade', icon: 'Gamepad2', sortOrder: 1 },
    { name: 'Action', slug: 'action', icon: 'Flame', sortOrder: 2 },
    { name: 'Slots', slug: 'slots', icon: 'Flame', sortOrder: 3 },
    { name: 'Crash', slug: 'crash', icon: 'Rocket', sortOrder: 4 },
    { name: 'Table Games', slug: 'table-games', icon: 'Tv', sortOrder: 5 },
    { name: 'Live Casino', slug: 'live-casino', icon: 'Tv', sortOrder: 6 },
    { name: 'Dice', slug: 'dice', icon: 'Dice5', sortOrder: 7 },
  ];
  // When existing categories have not been created yet, use sentinel slugs; resolve after category upsert.
  const categoryMap = new Map([
    ['arcade', 'arcade'], ['action', 'action'], ['slots', 'slots'], ['crash', 'crash'],
    ['table-games', 'table-games'], ['live-casino', 'live-casino'], ['dice', 'dice'],
  ]);
  const games = [
    // 5 Vercel Games
    {
      name: 'Pinball Cashout',
      slug: 'pinball-cashout',
      categoryId: categoryMap.get('arcade')!,
      provider: 'Pinball Retro Lab',
      thumbnail: '/assets/games/pinball.jpg',
      banner: '/assets/games/pinball.jpg',
      gameUrl: 'https://pinballfe.vercel.app',
      status: GameBadge.HOT,
      minBet: 1.0,
      maxBet: 500.0,
      isFeatured: true,
      sortOrder: 1,
    },
    {
      name: 'Galaga Skill Wager',
      slug: 'galaga-skill-wager',
      categoryId: categoryMap.get('arcade')!,
      provider: 'Bandai Classic Arcade',
      thumbnail: '/assets/games/galaga.png',
      banner: '/assets/games/galaga.png',
      gameUrl: 'https://galaga-fe.vercel.app',
      status: GameBadge.POPULAR,
      minBet: 1.0,
      maxBet: 500.0,
      isFeatured: true,
      sortOrder: 2,
    },
    {
      name: 'Bomber Boy',
      slug: 'bomber-boy',
      categoryId: categoryMap.get('action')!,
      provider: 'Bomber Studio',
      thumbnail: '/assets/games/bomberboy.jpg',
      banner: '/assets/games/bomberboy.jpg',
      gameUrl: 'https://bomberboy-game.vercel.app/',
      status: GameBadge.HOT,
      minBet: 2.0,
      maxBet: 800.0,
      isFeatured: true,
      sortOrder: 3,
    },
    {
      name: "Liar's Dice",
      slug: 'liars-dice',
      categoryId: categoryMap.get('table-games')!,
      provider: 'Dice Master Gaming',
      thumbnail: '/assets/games/liarsdice.jpg',
      banner: '/assets/games/liarsdice.jpg',
      gameUrl: 'https://lair-s-daice.vercel.app/',
      status: GameBadge.NEW,
      minBet: 5.0,
      maxBet: 1000.0,
      isFeatured: true,
      sortOrder: 4,
    },
    {
      name: 'Ship, Captain & Crew',
      slug: 'ship-captain-crew',
      categoryId: categoryMap.get('dice')!,
      provider: 'Nautical Rollers',
      thumbnail: '/assets/games/shipcaptain.jpg',
      banner: '/assets/games/shipcaptain.jpg',
      gameUrl: 'https://ship-captain-crew-fe.vercel.app/',
      status: GameBadge.HOT,
      minBet: 2.0,
      maxBet: 600.0,
      isFeatured: true,
      sortOrder: 5,
    },
    // 5 Classic Original Games
    {
      name: 'Candy Fortune',
      slug: 'candy-fortune',
      categoryId: categoryMap.get('slots')!,
      provider: 'SweetWorks Games',
      thumbnail: 'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?w=600',
      banner: 'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?w=800',
      gameUrl: null,
      status: GameBadge.HOT,
      minBet: 1.0,
      maxBet: 500.0,
      isFeatured: true,
      sortOrder: 6,
    },
    {
      name: 'Olympus Quest',
      slug: 'olympus-quest',
      categoryId: categoryMap.get('slots')!,
      provider: 'Mythic Play',
      thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600',
      banner: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800',
      gameUrl: null,
      status: GameBadge.POPULAR,
      minBet: 2.0,
      maxBet: 800.0,
      isFeatured: true,
      sortOrder: 7,
    },
    {
      name: 'Sky Aviator',
      slug: 'sky-aviator',
      categoryId: categoryMap.get('crash')!,
      provider: 'Velocity Tech',
      thumbnail: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=600',
      banner: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800',
      gameUrl: null,
      status: GameBadge.HOT,
      minBet: 1.0,
      maxBet: 1000.0,
      isFeatured: true,
      sortOrder: 8,
    },
    {
      name: 'Lucky Roulette',
      slug: 'lucky-roulette',
      categoryId: categoryMap.get('live-casino')!,
      provider: 'Spin Palace Live',
      thumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600',
      banner: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=800',
      gameUrl: null,
      status: GameBadge.POPULAR,
      minBet: 2.0,
      maxBet: 1500.0,
      isFeatured: true,
      sortOrder: 9,
    },
    {
      name: 'Mines',
      slug: 'mines',
      categoryId: categoryMap.get('arcade')!,
      provider: 'Grid Logic',
      thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600',
      banner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
      gameUrl: null,
      status: GameBadge.HOT,
      minBet: 1.0,
      maxBet: 1000.0,
      isFeatured: true,
      sortOrder: 10,
    },
  ];

  // A complete preflight, so we never modify anything when DB connectivity fails.
  const [existingCategories, existingGames] = await Promise.all([
    prisma.gameCategory.findMany({ select: { id: true, slug: true, isActive: true } }),
    prisma.game.findMany({ select: { slug: true, isActive: true, gameUrl: true } }),
  ]);
  const byCategory = new Map(existingCategories.map(c => [c.slug, c]));
  const byGame = new Map(existingGames.map(g => [g.slug, g]));
  const missingCategories = categories.filter(c => !byCategory.has(c.slug));
  const missingGames = games.filter(g => !byGame.has(g.slug));
  const inactiveExisting = games.filter(g => byGame.has(g.slug) && !byGame.get(g.slug)!.isActive).map(g => g.slug);

  console.log(`[games] categories in DB: ${existingCategories.length}; missing: ${missingCategories.length}`);
  console.log(`[games] games in DB: ${existingGames.length}; missing: ${missingGames.length}`);
  if (inactiveExisting.length) console.log(`[games] NOTE: existing inactive games left unchanged: ${inactiveExisting.join(', ')}`);
  if (!apply) {
    console.log('[games] CHECK ONLY: No changes made. Re-run with --apply to create missing catalogue records.');
    return;
  }

  for (const cat of categories) {
    await prisma.gameCategory.upsert({
      where: { slug: cat.slug },
      create: cat,
      update: {},
    });
  }
  const freshCategories = await prisma.gameCategory.findMany({ select: { id: true, slug: true, isActive: true } });
  const ids = new Map(freshCategories.map(c => [c.slug, c.id]));
  for (const game of games) {
    const { categoryId: categorySlug, ...gameFields } = game;
    const categoryId = categorySlug ? ids.get(categorySlug) : undefined;
    if (!categoryId) throw new Error(`Missing category for ${game.slug}`);
    // Only games with a real game URL are published on first creation.
    // Legacy classics are retained as hidden placeholders until implemented.
    await prisma.game.upsert({
      where: { slug: game.slug },
      create: { ...gameFields, categoryId, isActive: !!game.gameUrl },
      update: {},
    });
  }
  const active = await prisma.game.count({ where: { isActive: true, category: { isActive: true } } });
  console.log(`[games] completed; active catalogue games: ${active}`);
  console.log('[games] Existing game settings and all financial data were preserved.');
}

main().catch(err => { console.error('[games] bootstrap failed:', err); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
