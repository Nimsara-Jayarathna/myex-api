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

CategorySchema.index(
  { user: 1, type: 1 },
  {
    unique: true,
    name: 'uniq_user_active_default_category_per_type',
    partialFilterExpression: {
      isDefault: true,
      isActive: true,
      user: { $type: 'objectId' },
    },
  },
);

CategorySchema.index(
  { type: 1 },
  {
    unique: true,
    name: 'uniq_global_active_default_category_per_type',
    partialFilterExpression: {
      user: null,
      isDefault: true,
      isActive: true,
    },
  },
);
