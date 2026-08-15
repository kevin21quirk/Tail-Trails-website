const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

function getS3Client() {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials are not configured. Set AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY environment variables.');
  }

  return new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function getBucket() {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) throw new Error('AWS_S3_BUCKET environment variable is not configured.');
  return bucket;
}

function sanitiseFilename(name) {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 100);
}

function getS3Prefix(clientId) {
  return `tails-trails/client-${clientId}/`;
}

async function uploadToS3(key, body, contentType) {
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

async function getPresignedDownloadUrl(key, originalName, expiresIn = 300, disposition = 'inline') {
  const client = getS3Client();
  const safeName = originalName ? sanitiseFilename(originalName) : 'document';
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ResponseContentDisposition: `${disposition}; filename="${safeName}"`,
  });
  return getSignedUrl(client, command, { expiresIn });
}

async function deleteFromS3(key) {
  const client = getS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: getBucket(),
      Key: key,
    })
  );
}

module.exports = {
  getS3Client,
  getBucket,
  getS3Prefix,
  sanitiseFilename,
  uploadToS3,
  getPresignedDownloadUrl,
  deleteFromS3,
};
