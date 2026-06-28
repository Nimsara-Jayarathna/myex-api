import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AdminOtpChallengeDocument = HydratedDocument<AdminOtpChallenge>;

@Schema({ timestamps: true })
export class AdminOtpChallenge {
  _id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AdminUser', required: true, index: true })
  adminId!: Types.ObjectId;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  email!: string;

  @Prop({ required: true, index: true })
  challengeTokenHash!: string;

  @Prop({ required: true })
  otpHash!: string;

  @Prop({ enum: ['pending', 'verified', 'expired', 'locked', 'consumed', 'cancelled'], default: 'pending', index: true })
  status!: 'pending' | 'verified' | 'expired' | 'locked' | 'consumed' | 'cancelled';

  @Prop({ default: 0, min: 0 })
  attemptCount!: number;

  @Prop({ default: 3, min: 1 })
  maxAttempts!: number;

  @Prop({ default: 0, min: 0 })
  resendCount!: number;

  @Prop({ default: Date.now })
  resendAvailableAt!: Date;

  @Prop({ default: null })
  lockedUntil?: Date | null;

  @Prop({ required: true, index: { expireAfterSeconds: 0 } })
  expiresAt!: Date;

  @Prop({ default: null })
  usedAt?: Date | null;

  @Prop({ default: null })
  invalidatedAt?: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const AdminOtpChallengeSchema = SchemaFactory.createForClass(AdminOtpChallenge);
