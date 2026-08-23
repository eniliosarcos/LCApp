const crypto = require('crypto');
const { S3Client, PutObjectCommand, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const logger = require('./logger');

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET;
const publicUrl = process.env.R2_PUBLIC_URL;

let client;

function getClient() {
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    return null;
  }
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return client;
}

async function uploadVariants(images, folder) {
  const r2 = getClient();
  if (!r2) {
    throw new Error('Configuración de R2 incompleta');
  }
  const basePath = folder || `products/${crypto.randomUUID()}`;
  const keys = [];
  try {
    for (const { width, buffer } of images) {
      const key = `${basePath}/${width}w.webp`;
      await r2.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: 'image/webp',
          CacheControl: 'public, max-age=31536000, immutable',
        })
      );
      keys.push(key);
    }
    return {
      variants: images.map(({ width }, index) => ({ width, url: `${publicUrl}/${keys[index]}` })),
      primaryUrl: `${publicUrl}/${keys[0]}`,
    };
  } catch (err) {
    await cleanup(r2, keys);
    throw err;
  }
}

async function cleanup(r2, keys) {
  if (!keys.length) {
    return;
  }
  try {
    await r2.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: keys.map(key => ({ Key: key })) },
      })
    );
  } catch (err) {
    logger.error({ err, keyCount: keys.length }, 'R2 cleanup failed (orphaned objects possible)');
  }
}

async function deleteImageUrls(urls) {
  const r2 = getClient();
  if (!r2 || !urls?.length) {
    return;
  }
  const keys = urls
    .filter(url => typeof url === 'string' && publicUrl && url.startsWith(publicUrl))
    .map(url => url.slice(publicUrl.length + 1));
  if (!keys.length) {
    return;
  }
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    try {
      await r2.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: batch.map(key => ({ Key: key })) },
        })
      );
    } catch (err) {
      logger.error({ err, keyCount: batch.length }, 'R2 batch delete failed');
    }
  }
}

function extractR2Urls(images) {
  if (!Array.isArray(images)) {
    return [];
  }
  const urls = [];
  for (const img of images) {
    if (img.url) {
      urls.push(img.url);
    }
    if (Array.isArray(img.variants)) {
      for (const v of img.variants) {
        if (v.url) {
          urls.push(v.url);
        }
      }
    }
  }
  return urls;
}

module.exports = { uploadVariants, deleteImageUrls, extractR2Urls };
