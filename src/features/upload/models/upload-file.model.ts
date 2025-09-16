const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
]);

export class InvalidUploadFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidUploadFileError';
  }
}

export interface UploadFile {
  mimetype: string;
  originalname: string;
}

export function createUploadFile(props: {
  mimetype: string;
  originalname: string;
}): UploadFile {
  if (!props?.mimetype?.trim() || !props?.originalname?.trim()) {
    throw new InvalidUploadFileError('File metadata is required');
  }

  if (!ALLOWED_MIME_TYPES.has(props.mimetype)) {
    throw new InvalidUploadFileError('Unsupported MIME type');
  }

  return {
    mimetype: props.mimetype,
    originalname: props.originalname,
  };
}
