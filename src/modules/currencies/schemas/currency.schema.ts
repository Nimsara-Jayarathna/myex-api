import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Model, Types } from 'mongoose';

export type CurrencyDocument = HydratedDocument<Currency>;

@Schema({ timestamps: true })
export class Currency {
  _id!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  code!: string;

  @Prop({ required: true, trim: true })
  symbol!: string;

  @Prop({ default: true, index: true })
  isActive!: boolean;

  @Prop({ default: false })
  isDefault!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export const CurrencySchema = SchemaFactory.createForClass(Currency);

CurrencySchema.pre('save', async function (this: CurrencyDocument) {
  if (this.isDefault) {
    const model = this.constructor as Model<CurrencyDocument>;
    await model.updateMany({ _id: { $ne: this._id } }, { $set: { isDefault: false } });
  }
});
