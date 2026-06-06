require('dotenv').config();

const {
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions
} = require('@azure/storage-blob');

const parseBlobUrl = () => {
  const blobUrl = process.env.BLOB_URL || '';
  const match = blobUrl.match(
    /https:\/\/([^.]+)\.blob\.core\.windows\.net\/([^/?]+)/
  );

  if (match) {
    return {
      accountName: match[1],
      containerName: match[2]
    };
  }

  return {
    accountName: process.env.AZURE_STORAGE_ACCOUNT || '',
    containerName:
      process.env.BLOB_CONTAINER_NAME ||
      process.env.BOLOB_CONTAINER_NAME ||
      'lms-data'
  };
};

const { accountName, containerName } = parseBlobUrl();
const accountKey = process.env.AZURE_STORAGE_KEY || '';
const SAS_EXPIRY_HOURS = Number(process.env.BLOB_SAS_EXPIRY_HOURS || 24);

const buildBaseBlobUrl = (filepath) => {
  const normalizedPath = String(filepath || '').replace(/^\/+/, '');
  if (!normalizedPath || !accountName || !containerName) return null;

  const encodedPath = normalizedPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `https://${accountName}.blob.core.windows.net/${containerName}/${encodedPath}`;
};

const buildBlobUrlWithEnvSas = (filepath) => {
  const base = buildBaseBlobUrl(filepath);
  if (!base) return null;

  const sas =
    process.env.BLOB_SAS_TOKEN || process.env.BLOB_READ_SAS_TOKEN || '';

  if (!sas) return base;

  const token = sas.startsWith('?') ? sas.slice(1) : sas;
  return `${base}?${token}`;
};

const buildSignedBlobUrl = (filepath) => {
  const normalizedPath = String(filepath || '').replace(/^\/+/, '');
  if (!normalizedPath || !accountName || !containerName || !accountKey) {
    return buildBlobUrlWithEnvSas(filepath);
  }

  const credential = new StorageSharedKeyCredential(accountName, accountKey);
  const startsOn = new Date(Date.now() - 5 * 60 * 1000);
  const expiresOn = new Date(
    Date.now() + SAS_EXPIRY_HOURS * 60 * 60 * 1000
  );

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName,
      blobName: normalizedPath,
      permissions: BlobSASPermissions.parse('r'),
      startsOn,
      expiresOn
    },
    credential
  ).toString();

  const base = buildBaseBlobUrl(filepath);
  return base ? `${base}?${sasToken}` : null;
};

const buildBlobUrl = (filepath) => {
  if (accountKey) {
    return buildSignedBlobUrl(filepath);
  }

  return buildBlobUrlWithEnvSas(filepath);
};

const resolveBlobUrl = ({ filePath, storedUrl } = {}) => {
  if (filePath) {
    return buildBlobUrl(filePath);
  }

  if (!storedUrl) return null;

  try {
    const parsed = new URL(storedUrl);
    const blobPath = parsed.pathname
      .replace(`/${containerName}/`, '')
      .split('/')
      .map((segment) => decodeURIComponent(segment))
      .join('/');

    if (blobPath) {
      return buildBlobUrl(blobPath);
    }
  } catch {
    // fall through to stored URL
  }

  return storedUrl;
};

module.exports = {
  accountName,
  containerName,
  accountKey,
  buildBaseBlobUrl,
  buildBlobUrl,
  buildSignedBlobUrl,
  resolveBlobUrl,
  isConfigured: () => Boolean(accountName && containerName && accountKey)
};
