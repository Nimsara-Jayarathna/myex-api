import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminAuditLog, AdminAuditLogSchema } from './schemas/admin-audit-log.schema';
import { AdminAuditService } from './admin-audit.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: AdminAuditLog.name, schema: AdminAuditLogSchema }])],
  providers: [AdminAuditService],
  exports: [MongooseModule, AdminAuditService],
})
export class AdminAuditModule {}
