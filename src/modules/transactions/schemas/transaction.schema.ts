import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TransactionDocument = HydratedDocument<Transaction>;

@Schema({ timestamps: true })
export class Transaction {
  _id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user!: Types.ObjectId;

  @Prop({ trim: true })
  title?: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ enum: ['income', 'expense'], required: true })
  type!: 'income' | 'expense';

  @Prop({ required: true, trim: true })
  category!: string;

  @Prop({ type: Types.ObjectId, ref: 'Category' })
  categoryId?: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amount!: number;

  @Prop({ default: Date.now })
  date!: Date;

  @Prop({ default: false })
  isCustomDate!: boolean;

  @Prop({ enum: ['active', 'undone'], default: 'active' })
  status!: 'active' | 'undone';

  createdAt!: Date;
  updatedAt!: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
TransactionSchema.index({ user: 1, date: -1 });
TransactionSchema.index({ user: 1, status: 1 });
