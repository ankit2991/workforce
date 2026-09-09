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
    minBet: Number(game.minBet),
    maxBet: Number(game.maxBet),
    status: game.status,
    tag: game.tag,
    isFeatured: game.isFeatured,
    description: `Experience premier entertainment with ${game.name}. Smooth graphics, certified RNG, and high payout rate.`,
  });
};
