import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AdminBackupJobDocument = HydratedDocument<AdminBackupJob>;

@Schema({ timestamps: true })
export class AdminBackupJob {
  _id!: Types.ObjectId;

  @Prop({ enum: ['running', 'success', 'failed', 'canceled'], default: 'running', index: true })
  status!: 'running' | 'success' | 'failed' | 'canceled';

  @Prop({ default: 0, min: 0, max: 100 })
  progress!: number;

  @Prop({ default: 'Preparing backup...' })
  stage!: string;

  @Prop({ default: 'remote_cloud_storage_node_01' })
  target!: string;

  @Prop({ default: null })
  initiatedBy?: string | null;

  @Prop({ default: Date.now })
  startedAt!: Date;

  @Prop({ default: null })
  completedAt?: Date | null;

  @Prop({ default: null })
  fileName?: string | null;

  @Prop({ default: null })
  storagePath?: string | null;

  @Prop({ default: null })
  fileSizeBytes?: number | null;

  @Prop({ default: null })
  errorCode?: string | null;

  @Prop({ default: null })
  errorMessage?: string | null;

  @Prop({ default: false })
  shouldFail!: boolean;
}

export const AdminBackupJobSchema = SchemaFactory.createForClass(AdminBackupJob);
