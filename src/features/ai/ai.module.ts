import { Module } from '@nestjs/common';
import { FirebaseModule } from 'src/infrastructure/firebase/firebase.module';
import { ReservationModule } from 'src/features/reservation/reservation.module';
import { AiService } from './application/ai.service';
import {
  AiStorePort,
  AiToolExecutorPort,
} from './application/ports/out/ai.ports';
import { AiContextService } from './application/services/ai-context.service';
import { AiToolExecutorService } from './application/services/ai-tool-executor.service';
import { AiUsageService } from './application/services/ai-usage.service';
import { AiAdminController } from './infrastructure/in/controllers/ai-admin.controller';
import { AiInternalController } from './infrastructure/in/controllers/ai-internal.controller';
import { AiFirestoreRepository } from './infrastructure/out/firestore/ai-firestore.repository';

@Module({
  imports: [FirebaseModule, ReservationModule],
  controllers: [AiAdminController, AiInternalController],
  providers: [
    AiService,
    AiUsageService,
    AiContextService,
    AiToolExecutorService,
    {
      provide: AiStorePort,
      useClass: AiFirestoreRepository,
    },
    {
      provide: AiToolExecutorPort,
      useExisting: AiToolExecutorService,
    },
  ],
})
export class AiModule {}
