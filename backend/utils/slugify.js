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

module.exports = { slugify, uniqueSlug };
