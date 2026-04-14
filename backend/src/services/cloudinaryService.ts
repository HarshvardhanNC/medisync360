import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

interface CloudinaryFetchOptions {
  publicId?: string;
  mimeType?: string;
}

interface CloudinaryDownloadOptions {
  publicId?: string;
  mimeType?: string;
  fileName?: string;
  expiresInSeconds?: number;
}

/**
 * Lazily configures Cloudinary using process.env values.
 * Must be called inside a function (not at module level) so that
 * dotenv has already loaded the .env file before this runs.
 */
const configureCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
};

/**
 * Uploads a file buffer to Cloudinary and returns its secure URL and public ID.
 * Files are stored in the 'medisync360/reports' folder.
 * No file is ever written to local disk.
 */
export const uploadToCloudinary = (
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    // Configure on every call — cheap lookup, guarantees env vars are present
    configureCloudinary();

    // Determine resource type: 'raw' for PDFs, 'image' for images
    const resourceType: 'raw' | 'image' | 'video' | 'auto' =
      mimeType === 'application/pdf' ? 'raw' : 'image';

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'medisync360/reports',
        resource_type: resourceType,
        public_id: `${Date.now()}_${originalName.replace(/\s+/g, '_')}`,
        use_filename: false,
        overwrite: false,
      },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error('Cloudinary upload failed'));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    // Convert Buffer to Readable stream and pipe to Cloudinary
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

/**
 * Fetches the raw bytes of a file stored on Cloudinary.
 * Used during integrity verification to recompute the SHA-256 hash.
 */
const getFileExtension = (url: string, mimeType?: string): string | undefined => {
  if (mimeType === 'application/pdf') {
    return 'pdf';
  }

  try {
    const pathname = new URL(url).pathname;
    const lastSegment = pathname.split('/').pop() || '';
    const ext = lastSegment.split('.').pop();
    if (ext && ext.length <= 5) {
      return ext;
    }
  } catch {
    // Ignore URL parsing failures and fall back to MIME-based defaults.
  }

  return undefined;
};

const derivePublicIdFromUrl = (url: string): string | undefined => {
  try {
    const pathParts = new URL(url).pathname.split('/').filter(Boolean);
    const uploadIndex = pathParts.findIndex((part) => part === 'upload');

    if (uploadIndex === -1 || uploadIndex + 1 >= pathParts.length) {
      return undefined;
    }

    const assetParts = pathParts.slice(uploadIndex + 1);

    // Remove optional version segment like v1712345678
    if (/^v\d+$/.test(assetParts[0])) {
      assetParts.shift();
    }

    if (!assetParts.length) {
      return undefined;
    }

    const last = assetParts[assetParts.length - 1];
    assetParts[assetParts.length - 1] = last.replace(/\.[^.]+$/, '');

    return assetParts.join('/');
  } catch {
    return undefined;
  }
};

const fetchWithHeaders = async (targetUrl: string): Promise<Response> => {
  return fetch(targetUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: '*/*, application/pdf',
    },
  });
};

export const fetchFileBufferFromCloudinary = async (
  url: string,
  options: CloudinaryFetchOptions = {}
): Promise<Buffer> => {
  let response = await fetchWithHeaders(url);
  const publicId = options.publicId || derivePublicIdFromUrl(url);

  // Some Cloudinary assets (for example private/authenticated or restricted file types)
  // require a signed delivery URL. Retry with a short-lived signed URL when unauthorized.
  if ((response.status === 401 || response.status === 403) && publicId) {
    configureCloudinary();

    const format = getFileExtension(url, options.mimeType) || '';
    const resourceType = options.mimeType === 'application/pdf' ? 'raw' : 'image';

    const signedUrl = cloudinary.utils.private_download_url(publicId, format, {
      resource_type: resourceType,
      type: 'upload',
      expires_at: Math.floor(Date.now() / 1000) + 120,
      attachment: false,
    } as any);

    response = await fetchWithHeaders(signedUrl);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch file from Cloudinary: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

export const getSignedCloudinaryDownloadUrl = (
  url: string,
  options: CloudinaryDownloadOptions = {}
): string => {
  const publicId = options.publicId || derivePublicIdFromUrl(url);

  if (!publicId) {
    throw new Error('Missing Cloudinary public ID for download link generation');
  }

  configureCloudinary();

  const format = getFileExtension(url, options.mimeType) || '';
  const resourceType = options.mimeType === 'application/pdf' ? 'raw' : 'image';
  const expiresInSeconds = options.expiresInSeconds ?? 120;

  return cloudinary.utils.private_download_url(publicId, format, {
    resource_type: resourceType,
    type: 'upload',
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
    attachment: options.fileName || true,
  } as any);
};

