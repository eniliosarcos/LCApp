function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function uniqueSlug(Model, baseSlug, excludeId) {
  const filter = { slug: new RegExp(`^${escapeRegExp(baseSlug)}(?:-\\d+)?$`) };
  if (excludeId) {
    filter._id = { $ne: excludeId };
  }
  const existing = await Model.find(filter).select('slug');
  const slugs = new Set(existing.map(doc => doc.slug));
  if (!slugs.has(baseSlug)) {
    return baseSlug;
  }
  let counter = 2;
  while (slugs.has(`${baseSlug}-${counter}`)) {
    counter += 1;
  }
  return `${baseSlug}-${counter}`;
}

function generateSkuPrefix(categoryName) {
  return String(categoryName)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase())
    .join('')
    .slice(0, 3);
}

async function uniqueSku(Model, prefix, excludeId) {
  const regex = new RegExp(`^${escapeRegExp(prefix)}\\d{3}$`);
  const filter = { sku: regex };
  if (excludeId) filter._id = { $ne: excludeId };
  const existing = await Model.find(filter).select('sku');
  const nums = new Set(existing.map(doc => parseInt(doc.sku.slice(-3), 10)));
  let next = 1;
  while (nums.has(next)) next += 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

module.exports = { slugify, uniqueSlug, generateSkuPrefix, uniqueSku };
