import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import crypto from 'node:crypto';

export type UserDocument = HydratedDocument<User> & {
  createPasswordResetToken(): string;
};

@Schema({ timestamps: true })
export class User {
  _id!: Types.ObjectId;

  @Prop({ trim: true })
  name?: string;

  @Prop({ required: true, trim: true })
  fname!: string;

  @Prop({ required: true, trim: true })
  lname!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true })
  password!: string;

  @Prop({ default: 10 })
  categoryLimit!: number;

  @Prop({ type: [String], default: ['Sales'] })
  defaultIncomeCategories!: string[];

  @Prop({ type: [String], default: ['Stock'] })
  defaultExpenseCategories!: string[];

  @Prop({ type: Types.ObjectId, ref: 'Currency' })
  currency?: Types.ObjectId;

  @Prop({ enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'], default: 'ACTIVE', index: true })
  status!: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

  @Prop({ default: 0 })
  tokenVersion!: number;

  @Prop({ default: false })
  mustChangePassword!: boolean;

  @Prop({ default: null })
  lastLoginAt?: Date | null;

  @Prop()
  passwordResetToken?: string;

  @Prop()
  passwordResetExpires?: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.virtual('fullName').get(function (this: UserDocument) {
  if (this.name) return this.name;
  return `${this.fname} ${this.lname}`.trim();
});

UserSchema.methods.createPasswordResetToken = function (this: UserDocument): string {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
  return resetToken;
};
