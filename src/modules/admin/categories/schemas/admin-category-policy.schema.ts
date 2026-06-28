import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AdminCategoryPolicyDocument = HydratedDocument<AdminCategoryPolicy>;

@Schema({ timestamps: true })
export class AdminCategoryPolicy {
  _id!: Types.ObjectId;

  @Prop({ default: 'global', unique: true, index: true })
  scope!: string;

  @Prop({ required: true, trim: true, default: 'General Income' })
  defaultIncomeCategoryName!: string;

  @Prop({ required: true, trim: true, default: 'Miscellaneous Expense' })
  defaultExpenseCategoryName!: string;

  @Prop({ required: true, default: 10, min: 1, max: 1000 })
  defaultCategoryLimit!: number;

  @Prop({ default: null })
  updatedBy?: string | null;
}

export const AdminCategoryPolicySchema = SchemaFactory.createForClass(AdminCategoryPolicy);
