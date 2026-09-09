import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/response';

export const getProductCategories = async (req: Request, res: Response) => {
  const categories = await prisma.productCategory.findMany({
    where: { isActive: true },
  });

  return sendSuccess(res, categories, 'Product categories retrieved successfully');
};

export const getProducts = async (req: Request, res: Response) => {
  const search = req.query.search as string;
  const categorySlug = req.query.category as string;
  const featured = req.query.featured === 'true';

  const whereClause: any = { isActive: true };

  if (categorySlug && categorySlug !== 'all') {
    const cat = await prisma.productCategory.findUnique({ where: { slug: categorySlug } });
    if (cat) {
      whereClause.categoryId = cat.id;
    }
  }

  if (search) {
    whereClause.name = { contains: search, mode: 'insensitive' };
  }

  if (featured) {
    whereClause.isFeatured = true;
  }

  const products = await prisma.product.findMany({
    where: whereClause,
    include: { category: true },
    orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
  });

  const formatted = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    shortDescription: p.shortDescription,
    image: p.image,
    price: Number(p.price),
    points: p.points || 0,
    stock: p.stock,
    category: p.category.name,
    categorySlug: p.category.slug,
    isFeatured: p.isFeatured,
  }));

  return sendSuccess(res, formatted, 'Products retrieved successfully');
};

export const getProductBySlug = async (req: Request, res: Response) => {
  const slug = req.params.slug as string;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { category: true },
  });

  if (!product || !product.isActive) {
    return sendError(res, 'Product not found', 'NOT_FOUND', 404);
  }

  return sendSuccess(res, {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    shortDescription: product.shortDescription,
    image: product.image,
    price: Number(product.price),
    points: product.points || 0,
    stock: product.stock,
    category: product.category.name,
    categorySlug: product.category.slug,
    isFeatured: product.isFeatured,
  });
};
