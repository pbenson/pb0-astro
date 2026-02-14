#!/usr/bin/env node
/**
 * Import Cherry Arbor Design content from cad-port into Astro content collections.
 *
 * Usage: node scripts/import-cad.mjs [path-to-cad-port]
 * Default path: ~/cad-port
 */

import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, readdirSync } from 'fs';
import { join, resolve, basename } from 'path';

const cadPort = resolve(process.argv[2] || join(process.env.HOME, 'cad-port'));
const astroRoot = resolve(import.meta.dirname, '..');

const productsDir = join(astroRoot, 'src/content/cad-products');
const blogDir = join(astroRoot, 'src/content/cad-blog');
const imgDestProducts = join(astroRoot, 'public/images/cad/products');
const imgDestBlog = join(astroRoot, 'public/images/cad/blog');

mkdirSync(productsDir, { recursive: true });
mkdirSync(blogDir, { recursive: true });
mkdirSync(imgDestProducts, { recursive: true });
mkdirSync(imgDestBlog, { recursive: true });

// --- Load JSON ---
const products = JSON.parse(readFileSync(join(cadPort, 'products.json'), 'utf8'));
const blogPosts = JSON.parse(readFileSync(join(cadPort, 'blog_posts.json'), 'utf8'));

// --- Build cross-reference map ---
// Extract blog slugs mentioned in product links and vice versa
function extractBlogSlug(href) {
  const match = href.match(/\/blogs\/news\/([^/?#]+)/);
  return match ? match[1] : null;
}

function extractProductSlug(href) {
  const match = href.match(/\/products\/([^/?#]+)/);
  return match ? match[1] : null;
}

const productToBlog = new Map();
const blogToProduct = new Map();

for (const product of products) {
  const blogSlugs = [];
  for (const link of product.links || []) {
    const bs = extractBlogSlug(link.href);
    if (bs) blogSlugs.push(bs);
  }
  if (blogSlugs.length) productToBlog.set(product.slug, blogSlugs);
}

for (const post of blogPosts) {
  const productSlugs = [];
  for (const link of post.links || []) {
    const ps = extractProductSlug(link.href);
    if (ps) productSlugs.push(ps);
  }
  if (productSlugs.length) blogToProduct.set(post.slug, productSlugs);
}

// --- Helpers ---
function escapeYaml(str) {
  if (!str) return '""';
  // If it contains special chars, wrap in quotes and escape internal quotes
  if (/[:\n"'#{}[\],&*?|>!%@`]/.test(str) || str.trim() !== str) {
    return '"' + str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
  }
  return str;
}

function yamlArray(arr, indent = '  ') {
  if (!arr || arr.length === 0) return '[]';
  return '\n' + arr.map(item => `${indent}- ${escapeYaml(item)}`).join('\n');
}

function copyImages(srcDir, destDir, slug) {
  const slugDest = join(destDir, slug);
  if (!existsSync(srcDir)) return [];
  mkdirSync(slugDest, { recursive: true });

  const files = readdirSync(srcDir).filter(f => /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(f));
  for (const file of files) {
    cpSync(join(srcDir, file), join(slugDest, file));
  }
  return files;
}

function descriptionToMarkdown(blocks) {
  if (!blocks || blocks.length === 0) return '';
  return blocks.map(b => {
    const text = b.text || '';
    return text;
  }).join('\n\n');
}

function contentToMarkdown(blocks, links) {
  if (!blocks || blocks.length === 0) return '';

  // Build a link map for inline references
  const linkMap = new Map();
  for (const link of links || []) {
    if (link.text && link.href) {
      linkMap.set(link.text, link.href);
    }
  }

  return blocks.map(b => {
    let text = b.text || '';

    // Try to re-insert links where link text appears in content
    for (const [linkText, href] of linkMap) {
      // Only replace if the text appears and isn't already a markdown link
      const escaped = linkText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?<!\\[)${escaped}(?!\\])`, 'g');
      text = text.replace(regex, `[${linkText}](${href})`);
    }

    if (b.tag === 'h1') return `# ${text}`;
    if (b.tag === 'h2') return `## ${text}`;
    if (b.tag === 'h3') return `### ${text}`;
    return text;
  }).join('\n\n');
}

// --- Generate product MDX files ---
let productCount = 0;
for (const product of products) {
  // Skip shipping/placeholder products
  if (product.title.toLowerCase().includes('shipping') && product.variants?.[0]?.price === '1.00') continue;

  const slug = product.slug;
  const description = descriptionToMarkdown(product.description);
  const firstVariant = product.variants?.[0];
  const price = firstVariant?.price || '0.00';

  // Price range for multi-variant products
  let priceRange = '';
  if (product.variants?.length > 1) {
    const prices = product.variants.map(v => parseFloat(v.price)).filter(p => p > 0).sort((a, b) => a - b);
    if (prices.length > 1 && prices[0] !== prices[prices.length - 1]) {
      priceRange = `$${prices[0].toFixed(2)} - $${prices[prices.length - 1].toFixed(2)}`;
    }
  }

  // Copy product images
  const imgSrc = join(cadPort, 'images/products', slug);
  const localImages = copyImages(imgSrc, imgDestProducts, slug);

  // Image paths for frontmatter
  const imagePaths = localImages.map(f => `/images/cad/products/${slug}/${f}`);

  // Featured image
  let featuredImage = '';
  if (imagePaths.length > 0) {
    featuredImage = imagePaths[0];
  }

  // Related blog slugs
  const relatedBlogSlugs = productToBlog.get(slug) || [];

  // Variant info
  const variants = (product.variants || [])
    .filter(v => v.title !== 'Default Title' || product.variants.length === 1)
    .map(v => ({
      title: v.title,
      price: v.price,
      available: v.available,
    }));

  // Options
  const options = (product.options || [])
    .filter(o => o.name !== 'Title' || o.values[0] !== 'Default Title');

  const frontmatter = `---
title: ${escapeYaml(product.title)}
slug: ${slug}
description: ${escapeYaml(description.split('\n\n')[0].substring(0, 300))}
price: "${price}"${priceRange ? `\npriceRange: ${escapeYaml(priceRange)}` : ''}
soldOut: ${product.sold_out}${featuredImage ? `\nfeaturedImage: ${featuredImage}` : ''}
images: ${yamlArray(imagePaths)}
variants:${variants.length === 0 ? ' []' : '\n' + variants.map(v =>
    `  - title: ${escapeYaml(v.title)}\n    price: "${v.price}"\n    available: ${v.available}`
  ).join('\n')}
options:${options.length === 0 ? ' []' : '\n' + options.map(o =>
    `  - name: ${escapeYaml(o.name)}\n    values: ${yamlArray(o.values, '      ')}`
  ).join('\n')}
relatedBlogSlugs: ${yamlArray(relatedBlogSlugs)}
createdAt: "${product.created_at}"
---`;

  const mdxContent = `${frontmatter}\n\n${description}\n`;

  writeFileSync(join(productsDir, `${slug}.mdx`), mdxContent);
  productCount++;
}

console.log(`✓ Generated ${productCount} product MDX files`);

// --- Generate blog post MDX files ---
let blogCount = 0;
for (const post of blogPosts) {
  const slug = post.slug;
  const content = contentToMarkdown(post.content, post.links);

  // Copy blog images
  const imgSrc = join(cadPort, 'images', slug);
  const localImages = copyImages(imgSrc, imgDestBlog, slug);

  // Featured image
  let featuredImage = '';
  if (localImages.length > 0) {
    featuredImage = `/images/cad/blog/${slug}/${localImages[0]}`;
  }

  // Related product slugs
  const relatedProductSlugs = blogToProduct.get(slug) || [];

  // Insert images into content at reasonable points
  const imageMarkdown = localImages.map(f =>
    `![](/images/cad/blog/${slug}/${f})`
  ).join('\n\n');

  const frontmatter = `---
title: ${escapeYaml(post.title)}
slug: ${slug}
date: "${post.date}"${featuredImage ? `\nfeaturedImage: ${featuredImage}` : ''}
relatedProductSlugs: ${yamlArray(relatedProductSlugs)}
---`;

  const mdxContent = `${frontmatter}\n\n${content}\n\n${imageMarkdown ? `## Images\n\n${imageMarkdown}\n` : ''}`;

  writeFileSync(join(blogDir, `${slug}.mdx`), mdxContent);
  blogCount++;
}

console.log(`✓ Generated ${blogCount} blog post MDX files`);
console.log(`✓ Images copied to public/images/cad/`);
console.log(`\nCross-references:`);
console.log(`  ${productToBlog.size} products link to blog posts`);
console.log(`  ${blogToProduct.size} blog posts link to products`);
