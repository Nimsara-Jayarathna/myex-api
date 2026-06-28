import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TokenCleanupJob } from './token-cleanup.job';

@Module({ imports: [AuthModule], providers: [TokenCleanupJob] })
export class JobsModule {}
