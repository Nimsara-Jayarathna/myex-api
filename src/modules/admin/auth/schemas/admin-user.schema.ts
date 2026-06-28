import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AdminUserDocument = HydratedDocument<AdminUser>;

@Schema({ timestamps: true })
export class AdminUser {
  _id!: Types.ObjectId;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, select: false })
  passwordHash!: string;

  @Prop({ type: [String], default: ['super_admin'] })
  roles!: string[];

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: null })
  lastLoginAt?: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const AdminUserSchema = SchemaFactory.createForClass(AdminUser);
