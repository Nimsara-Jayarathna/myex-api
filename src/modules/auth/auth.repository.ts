import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Token, type TokenDocument } from './schemas/token.schema';

@Injectable()
export class AuthRepository {
  constructor(@InjectModel(Token.name) private readonly tokenModel: Model<TokenDocument>) {}

  createToken(payload: Partial<Token>) {
    return this.tokenModel.create(payload);
  }

  findToken(token: string, type: Token['type']) {
    return this.tokenModel.findOne({ token, type, expiresAt: { $gt: new Date() } });
  }

  deleteToken(token: string) {
    return this.tokenModel.deleteOne({ token });
  }

  deleteExpiredTokens() {
    return this.tokenModel.deleteMany({ expiresAt: { $lte: new Date() } });
  }
}
