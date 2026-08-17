const crypto = require('crypto');
const { S3Client, PutObjectCommand, DeleteObjectsCommand } = require('@aws-sdk/client-s3');

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

async function uploadVariants(images) {
  const r2 = getClient();
  if (!r2) {
    throw new Error('Configuración de R2 incompleta');
  }
  const folder = `products/${crypto.randomUUID()}`;
  const keys = [];
  try {
    for (const { width, buffer } of images) {
      const key = `${folder}/${width}w.webp`;
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
  } catch {
    // Best effort: si la limpieza falla, el objeto huérfano es inofensivo.
  }
}

module.exports = { uploadVariants };
