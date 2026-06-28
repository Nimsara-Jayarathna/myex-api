import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminBackupJob, AdminBackupJobSchema } from './schemas/admin-backup-job.schema';
import { AdminDeleteRequest, AdminDeleteRequestSchema } from './schemas/admin-delete-request.schema';
import { AdminSystemService } from './admin-system.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AdminBackupJob.name, schema: AdminBackupJobSchema },
      { name: AdminDeleteRequest.name, schema: AdminDeleteRequestSchema },
    ]),
  ],
  providers: [AdminSystemService],
  exports: [AdminSystemService],
})
export class AdminSystemModule {}
