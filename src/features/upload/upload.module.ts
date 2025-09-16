import { Module } from '@nestjs/common';
import { UploadController } from './controllers/upload.controller';
import { UploadService } from './services/upload.service';
import { UploadRepository } from './repositories/upload.repository';
import { UploadRepositoryPort } from './repositories/upload.repository.port';

@Module({
  controllers: [UploadController],
  providers: [
    UploadService,
    {
      provide: UploadRepositoryPort,
      useClass: UploadRepository,
    },
  ],
})
export class UploadModule {}
