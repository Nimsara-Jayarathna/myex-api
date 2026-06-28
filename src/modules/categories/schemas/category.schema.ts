import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({ timestamps: true })
export class Category {
  _id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  user?: Types.ObjectId | null;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ enum: ['income', 'expense'], required: true })
  type!: 'income' | 'expense';

  @Prop({ default: false })
  isDefault!: boolean;

  @Prop({ default: true })
  isActive!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
CategorySchema.index({ user: 1, type: 1, name: 1 }, { unique: true });
