import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AdminDeleteRequestDocument = HydratedDocument<AdminDeleteRequest>;

@Schema({ timestamps: true })
export class AdminDeleteRequest {
  _id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  userId?: Types.ObjectId | null;

  @Prop({ required: true, trim: true })
  userName!: string;

  @Prop({ required: true, lowercase: true, trim: true })
  userEmail!: string;

  @Prop({ enum: ['pending', 'approved', 'denied'], default: 'pending', index: true })
  status!: 'pending' | 'approved' | 'denied';

  @Prop({ default: 'User requested account deletion.' })
  reason!: string;

  @Prop({ default: Date.now })
  requestedAt!: Date;

  @Prop({ default: null })
  reviewedAt?: Date | null;

  @Prop({ default: null })
  reviewedBy?: string | null;

  @Prop({ default: null })
  reviewNote?: string | null;
}

export const AdminDeleteRequestSchema = SchemaFactory.createForClass(AdminDeleteRequest);
