import { Request, Response } from 'express';
import { GameBadge } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/response';

// The public catalogue deliberately exposes only active games from active categories.
// Preview games with no launch URL can be created for testing, but should remain inactive.
const gameCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  categorySlug: z.string().trim().min(1).max(100).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  provider: z.string().trim().min(1).max(120).optional(),
  thumbnail: z.string().trim().min(1).max(2048).optional(),
  banner: z.string().trim().max(2048).nullable().optional(),
  gameUrl: z.union([z.string().trim().max(2048).refine(v => v === '' || /^https:\/\//i.test(v), 'Game launch URL must use HTTPS'), z.null()]).optional(),
  minBet: z.number().finite().nonnegative().optional(),
  maxBet: z.number().finite().nonnegative().optional(),
  status: z.nativeEnum(GameBadge).optional(),
  tag: z.string().max(60).nullable().optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
}).strict();
const gameUpdateSchema = gameCreateSchema.partial();

const formatGame = (g: any) => ({
  id: g.id,
  name: g.name,
  slug: g.slug,
  category: g.category.name,
  categorySlug: g.category.slug,
  provider: g.provider,
  thumbnail: g.thumbnail,
  banner: g.banner || g.thumbnail,
  gameUrl: g.gameUrl || undefined,
  minBet: Number(g.minBet),
  maxBet: Number(g.maxBet),
  status: g.status,
  tag: g.tag,
  isFeatured: g.isFeatured,
  isActive: g.isActive,
});

const gameSort: any = [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }];
const getQuery = (value: unknown): string | undefined => typeof value === 'string' ? value.trim() : undefined;

export const getGameCategories = async (_req: Request, res: Response) => {
  const categories = await prisma.gameCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  res.setHeader('Cache-Control', 'no-store');
  return sendSuccess(res, categories, 'Game categories retrieved successfully');
};

export const getGames = async (req: Request, res: Response) => {
  const search = getQuery(req.query.search);
  const categorySlug = getQuery(req.query.category);
  const featured = getQuery(req.query.featured);
  const where: any = { isActive: true, category: { isActive: true } };

  if (categorySlug && categorySlug !== 'all') {
    const category = await prisma.gameCategory.findUnique({ where: { slug: categorySlug } });
    if (!category || !category.isActive) {
      res.setHeader('Cache-Control', 'no-store');
      return sendSuccess(res, [], 'No active games in this category');
    }
    where.categoryId = category.id;
  }
  if (search) where.name = { contains: search, mode: 'insensitive' };
  if (featured === 'true') where.isFeatured = true;

  const games = await prisma.game.findMany({
    where,
    include: { category: true },
    orderBy: gameSort,
  });
  res.setHeader('Cache-Control', 'no-store');
  return sendSuccess(res, games.map(formatGame), 'Games retrieved successfully');
};

// Admin-only state, including inactive / missing-launch-URL games, for QA.
export const getManagedGames = async (_req: Request, res: Response) => {
  const games = await prisma.game.findMany({ include: { category: true }, orderBy: gameSort });
  res.setHeader('Cache-Control', 'no-store');
  return sendSuccess(res, games.map(formatGame), 'Managed games retrieved successfully');
};

// Lightweight public readiness check to distinguish an empty DB from a broken frontend.
export const getGamesStatus = async (_req: Request, res: Response) => {
  const [activeGames, totalGames, activeCategories] = await Promise.all([
    prisma.game.count({ where: { isActive: true, category: { isActive: true } } }),
    prisma.game.count(),
    prisma.gameCategory.count({ where: { isActive: true } }),
  ]);
  res.setHeader('Cache-Control', 'no-store');
  return sendSuccess(res, { state: 'ready', activeGames, totalGames, activeCategories }, 'Catalogue database reachable');
};

export const getGamesDiagnostics = async (_req: Request, res: Response) => {
  const [categories, games] = await Promise.all([
    prisma.gameCategory.findMany({ select: { id: true, slug: true, isActive: true } }),
    prisma.game.findMany({ select: { slug: true, gameUrl: true, isActive: true, categoryId: true } }),
  ]);
  const categoriesById = new Map(categories.map(c => [c.id, c]));
  const invisible = games.filter(g => !g.isActive || !categoriesById.get(g.categoryId)?.isActive);
  const noUrl = games.filter(g => !g.gameUrl);
  res.setHeader('Cache-Control', 'no-store');
  return sendSuccess(res, {
    totalGames: games.length,
    visibleGames: games.length - invisible.length,
    hiddenSlugs: invisible.map(g => g.slug),
    missingLaunchUrlSlugs: noUrl.map(g => g.slug),
    inactiveCategorySlugs: categories.filter(c => !c.isActive).map(c => c.slug),
  }, 'Catalogue diagnostics');
};

export const getGameBySlug = async (req: Request, res: Response) => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  if (!slug) {
    return sendError(res, 'Game slug is required', 'VALIDATION_ERROR', 400);
  }
  const game = await prisma.game.findUnique({
    where: { slug },
    include: { category: true },
  });
  if (!game || !game.isActive || !(game as any).category?.isActive) {
    return sendError(res, 'Game not found', 'NOT_FOUND', 404);
  }
  res.setHeader('Cache-Control', 'no-store');
  return sendSuccess(res, formatGame(game));
};

const getCategory = async (slug: string) => {
  return prisma.gameCategory.findUnique({ where: { slug } });
};

// Prisma MongoDB ObjectId queries reject ordinary slugs as invalid IDs.
const gameLookup = (value: string | string[] | undefined) => {
  const val = Array.isArray(value) ? value[0] : (value || '');
  return /^[a-f0-9]{24}$/i.test(val)
    ? { OR: [{ id: val }, { slug: val }] }
    : { slug: val };
};

export const createGame = async (req: Request, res: Response) => {
  const parsed = gameCreateSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Invalid game data', 'VALIDATION_ERROR', 400, parsed.error.flatten());
  const value = parsed.data;
  const slug = (value.categorySlug || value.category || 'slots').toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  const category = await getCategory(slug);
  if (!category) return sendError(res, 'Category does not exist. Run the game catalogue bootstrap.', 'CATEGORY_NOT_FOUND', 400);
  if (value.minBet !== undefined && value.maxBet !== undefined && value.minBet > value.maxBet) {
    return sendError(res, 'minBet cannot exceed maxBet', 'VALIDATION_ERROR', 400);
  }
  if (value.isActive === true && !value.gameUrl) {
    return sendError(res, 'Cannot activate a game without a launch URL', 'VALIDATION_ERROR', 400);
  }
  const game = await prisma.game.create({
    data: {
      name: value.name,
      slug: `${value.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'game'}-${Date.now()}`,
      categoryId: category.id,
      provider: value.provider || 'WorkPlay Originals',
      thumbnail: value.thumbnail || '/assets/games/pinball.jpg',
      banner: value.banner || value.thumbnail || null,
      gameUrl: value.gameUrl || null,
      minBet: value.minBet ?? 1,
      maxBet: value.maxBet ?? 500,
      status: value.status || GameBadge.DEFAULT,
      tag: value.tag || null,
      isFeatured: value.isFeatured ?? false,
      // Do not publish entries without an actual launch URL by default.
      isActive: value.isActive ?? Boolean(value.gameUrl),
      sortOrder: value.sortOrder ?? 0,
    },
    include: { category: true },
  });
  return sendSuccess(res, formatGame(game), 'Game created successfully', 201);
};

export const updateGame = async (req: Request, res: Response) => {
  const parsed = gameUpdateSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Invalid game data', 'VALIDATION_ERROR', 400, parsed.error.flatten());
  const value = parsed.data;
  const existing = await prisma.game.findFirst({ where: gameLookup(req.params.id) });
  if (!existing) return sendError(res, 'Game not found', 'NOT_FOUND', 404);
  const slug = value.categorySlug || value.category;
  let categoryId: string | undefined;
  if (slug) {
    const category = await getCategory(slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-'));
    if (!category) return sendError(res, 'Game category not found', 'CATEGORY_NOT_FOUND', 400);
    categoryId = category.id;
  }
  const minBet = value.minBet ?? existing.minBet;
  const maxBet = value.maxBet ?? existing.maxBet;
  if (minBet > maxBet) return sendError(res, 'minBet cannot exceed maxBet', 'VALIDATION_ERROR', 400);
  if (value.isActive === true && !(value.gameUrl ?? existing.gameUrl)) {
    return sendError(res, 'Cannot activate a game without a launch URL', 'VALIDATION_ERROR', 400);
  }
  const { category: _category, categorySlug: _categorySlug, ...updateFields } = value;
  const data: any = { ...updateFields };
  if (categoryId) data.categoryId = categoryId;
  // Keep slug stable to avoid breaking existing external references.
  const updated = await prisma.game.update({ where: { id: existing.id }, data, include: { category: true } });
  return sendSuccess(res, formatGame(updated), 'Game updated successfully');
};

// Soft delete: preserve records and avoid destructive changes to a live catalogue.
export const deleteGame = async (req: Request, res: Response) => {
  const existing = await prisma.game.findFirst({ where: gameLookup(req.params.id) });
  if (!existing) return sendError(res, 'Game not found', 'NOT_FOUND', 404);
  await prisma.game.update({ where: { id: existing.id }, data: { isActive: false } });
  return sendSuccess(res, { id: existing.id, isActive: false }, 'Game deactivated successfully');
};
