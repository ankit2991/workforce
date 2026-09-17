import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/response';

export const getGameCategories = async (req: Request, res: Response) => {
  const categories = await prisma.gameCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  return sendSuccess(res, categories, 'Game categories retrieved successfully');
};

export const getGames = async (req: Request, res: Response) => {
  const search = req.query.search as string;
  const categorySlug = req.query.category as string;
  const featuredOnly = req.query.featured === 'true';

  const whereClause: any = { isActive: true };

  if (categorySlug && categorySlug !== 'all') {
    const cat = await prisma.gameCategory.findUnique({ where: { slug: categorySlug } });
    if (cat) {
      whereClause.categoryId = cat.id;
    }
  }

  if (search) {
    whereClause.name = { contains: search, mode: 'insensitive' };
  }

  if (featuredOnly) {
    whereClause.isFeatured = true;
  }

  const games = await prisma.game.findMany({
    where: whereClause,
    include: { category: true },
    orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
  });

  const formatted = games.map((g) => ({
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
  }));

  return sendSuccess(res, formatted, 'Games retrieved successfully');
};

export const getGameBySlug = async (req: Request, res: Response) => {
  const slug = req.params.slug as string;
  const game = await prisma.game.findUnique({
    where: { slug },
    include: { category: true },
  });

  if (!game || !game.isActive) {
    return sendError(res, 'Game not found', 'NOT_FOUND', 404);
  }

  return sendSuccess(res, {
    id: game.id,
    name: game.name,
    slug: game.slug,
    category: game.category.name,
    categorySlug: game.category.slug,
    provider: game.provider,
    thumbnail: game.thumbnail,
    banner: game.banner || game.thumbnail,
    gameUrl: game.gameUrl || undefined,
    minBet: Number(game.minBet),
    maxBet: Number(game.maxBet),
    status: game.status,
    tag: game.tag,
    isFeatured: game.isFeatured,
    description: `Experience premier entertainment with ${game.name}. Smooth graphics, certified RNG, and high payout rate.`,
  });
};

export const createGame = async (req: Request, res: Response) => {
  const { name, categorySlug, provider, thumbnail, banner, gameUrl, minBet, maxBet, status, tag, isFeatured } = req.body;
  if (!name) return sendError(res, 'Game name is required', 'VALIDATION_ERROR', 400);

  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
  let category = await prisma.gameCategory.findFirst({
    where: { slug: categorySlug || 'slots' },
  });
  if (!category) {
    category = await prisma.gameCategory.findFirst();
  }

  const newGame = await prisma.game.create({
    data: {
      name,
      slug,
      categoryId: category!.id,
      provider: provider || 'WorkPlay Originals',
      thumbnail: thumbnail || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400',
      banner: banner || thumbnail,
      gameUrl: gameUrl || null,
      minBet: Number(minBet) || 1.0,
      maxBet: Number(maxBet) || 500.0,
      status: (status as any) || 'HOT',
      tag: tag || 'HOT',
      isFeatured: isFeatured ?? true,
      isActive: true,
    },
    include: { category: true },
  });

  return sendSuccess(res, {
    id: newGame.id,
    name: newGame.name,
    slug: newGame.slug,
    category: newGame.category.name,
    categorySlug: newGame.category.slug,
    provider: newGame.provider,
    thumbnail: newGame.thumbnail,
    banner: newGame.banner,
    gameUrl: newGame.gameUrl || undefined,
    minBet: Number(newGame.minBet),
    maxBet: Number(newGame.maxBet),
    status: newGame.status,
    tag: newGame.tag,
    isFeatured: newGame.isFeatured,
  }, 'Game created successfully', 201);
};

export const deleteGame = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await prisma.game.delete({ where: { id } });
  return sendSuccess(res, null, 'Game deleted successfully');
};

