const { BlobServiceClient } = require('@azure/storage-blob');
const azureConfig = require('./azure.config');

const sanitizeFileName = (name) =>
  String(name || 'file')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 180);

const uploadBuffer = async ({ buffer, mimeType, originalName, folder }) => {
  if (!azureConfig.isConfigured()) {
    const error = new Error(
      'Azure storage is not configured. Set AZURE_STORAGE_KEY and BLOB_URL.'
    );
    error.status = 503;
    throw error;
  }

  const safeName = sanitizeFileName(originalName);
  const filePath = `${folder}/${Date.now()}-${safeName}`;
  const connectionString = `DefaultEndpointsProtocol=https;AccountName=${azureConfig.accountName};AccountKey=${azureConfig.accountKey};EndpointSuffix=core.windows.net`;
  const client = BlobServiceClient.fromConnectionString(connectionString);
  const container = client.getContainerClient(azureConfig.containerName);
  const blockBlob = container.getBlockBlobClient(filePath);

  await blockBlob.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: mimeType || 'application/octet-stream' }
  });

  return {
    filePath,
    fileUrl: azureConfig.buildBaseBlobUrl(filePath)
  };
};

const downloadFile = async (filePath) => {
  if (!azureConfig.isConfigured()) {
    const error = new Error(
      'Azure storage is not configured. Set AZURE_STORAGE_KEY and BLOB_URL.'
    );
    error.status = 503;
    throw error;
  }

  const connectionString = `DefaultEndpointsProtocol=https;AccountName=${azureConfig.accountName};AccountKey=${azureConfig.accountKey};EndpointSuffix=core.windows.net`;
  const client = BlobServiceClient.fromConnectionString(connectionString);
  const container = client.getContainerClient(azureConfig.containerName);
  const blockBlob = container.getBlockBlobClient(filePath);
  const exists = await blockBlob.exists();

  if (!exists) {
    const error = new Error('File not found in storage');
    error.status = 404;
    throw error;
  }

  const downloadResponse = await blockBlob.download();

  return {
    stream: downloadResponse.readableStreamBody,
    contentType:
      downloadResponse.contentType || 'application/octet-stream',
    contentLength: downloadResponse.contentLength
  };
};

module.exports = {
  uploadBuffer,
  downloadFile,
  sanitizeFileName
};
