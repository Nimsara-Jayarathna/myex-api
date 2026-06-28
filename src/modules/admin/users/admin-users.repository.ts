import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model } from 'mongoose';
import { User, type UserDocument } from '../../users/schemas/user.schema';

@Injectable()
export class AdminUsersRepository {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  list(filter: FilterQuery<UserDocument>, skip: number, limit: number) {
    return this.userModel.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit);
  }

  count(filter: FilterQuery<UserDocument>) {
    return this.userModel.countDocuments(filter);
  }

  findById(id: string) {
    return this.userModel.findById(id).select('-password').populate('currency');
  }

  findByIdWithPassword(id: string) {
    return this.userModel.findById(id);
  }
}
