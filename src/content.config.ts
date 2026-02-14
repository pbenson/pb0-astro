import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const cadProducts = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/cad-products' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    description: z.string(),
    price: z.string(),
    priceRange: z.string().optional(),
    soldOut: z.boolean().default(false),
    featuredImage: z.string().optional(),
    images: z.array(z.string()).default([]),
    variants: z.array(z.object({
      title: z.string(),
      price: z.string(),
      available: z.boolean(),
    })).default([]),
    options: z.array(z.object({
      name: z.string(),
      values: z.array(z.string()),
    })).default([]),
    relatedBlogSlugs: z.array(z.string()).default([]),
    createdAt: z.string(),
  }),
});

const cadBlog = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/cad-blog' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    date: z.string(),
    featuredImage: z.string().optional(),
    relatedProductSlugs: z.array(z.string()).default([]),
  }),
});

export const collections = {
  'cad-products': cadProducts,
  'cad-blog': cadBlog,
};
