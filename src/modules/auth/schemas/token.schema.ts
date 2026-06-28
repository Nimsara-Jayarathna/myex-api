import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TokenDocument = HydratedDocument<Token>;

@Schema()
export class Token {
  _id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop({ lowercase: true, trim: true })
  email?: string;

  @Prop({ required: true })
  token!: string;

  @Prop({
    enum: [
      'register_otp',
      'reset_token',
      'email_change_current',
      'email_change_new',
      'registration_verified',
      'email_change_verified',
    ],
    required: true,
  })
  type!:
    | 'register_otp'
    | 'reset_token'
    | 'email_change_current'
    | 'email_change_new'
    | 'registration_verified'
    | 'email_change_verified';

  @Prop({ required: true, index: { expireAfterSeconds: 0 } })
  expiresAt!: Date;
}

export const TokenSchema = SchemaFactory.createForClass(Token);
