import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AdminAuditLogDocument = HydratedDocument<AdminAuditLog>;

@Schema({ timestamps: true })
export class AdminAuditLog {
  _id!: Types.ObjectId;

  @Prop({ type: String, default: null, index: true })
  adminEmail?: string | null;

  @Prop({ required: true })
  method!: string;

  @Prop({ required: true, index: true })
  path!: string;

  @Prop({ enum: ['success', 'failed'], required: true, index: true })
  status!: 'success' | 'failed';

  @Prop({ default: 0 })
  durationMs!: number;

  @Prop({ type: String, default: null })
  errorMessage?: string | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const AdminAuditLogSchema = SchemaFactory.createForClass(AdminAuditLog);
AdminAuditLogSchema.index({ createdAt: -1 });
