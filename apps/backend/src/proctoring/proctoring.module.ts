import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { ProctoringService } from './proctoring.service';
import { ProctoringController } from './proctoring.controller';

@Global()
@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ProctoringController],
  providers: [ProctoringService],
  exports: [ProctoringService],
})
export class ProctoringModule {}
