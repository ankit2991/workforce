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

export const createProduct = async (req: Request, res: Response) => {
  const { name, description, shortDescription, image, price, points, stock, categorySlug, isFeatured } = req.body;
  if (!name || !price) return sendError(res, 'Product name and price are required', 'VALIDATION_ERROR', 400);

  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
  let category = await prisma.productCategory.findFirst({
    where: { slug: categorySlug || 'vouchers' },
  });
  if (!category) {
    category = await prisma.productCategory.findFirst();
  }

  const newProd = await prisma.product.create({
    data: {
      name,
      slug,
      description: description || 'Premium workforce catalog merchandise',
      shortDescription: shortDescription || name,
      image: image || 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=400',
      price: Number(price),
      points: Number(points) || 0,
      stock: Number(stock) || 100,
      categoryId: category!.id,
      isFeatured: isFeatured ?? false,
      isActive: true,
    },
    include: { category: true },
  });

  return sendSuccess(res, {
    id: newProd.id,
    name: newProd.name,
    slug: newProd.slug,
    description: newProd.description,
    shortDescription: newProd.shortDescription,
    image: newProd.image,
    price: Number(newProd.price),
    points: newProd.points || 0,
    stock: newProd.stock,
    category: newProd.category.name,
    categorySlug: newProd.category.slug,
    isFeatured: newProd.isFeatured,
  }, 'Product created successfully', 201);
};

export const deleteProduct = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await prisma.product.delete({ where: { id } });
  return sendSuccess(res, null, 'Product deleted successfully');
};

