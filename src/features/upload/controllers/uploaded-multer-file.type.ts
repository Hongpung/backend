/** Nest `@UploadedFile()` / `@UploadedFiles()` 최소 계약 (Express.Multer.File 대체) */
export interface UploadedMulterFile {
  mimetype: string;
  originalname: string;
}
