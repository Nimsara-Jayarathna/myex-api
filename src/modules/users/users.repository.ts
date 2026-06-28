import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, Types, UpdateQuery } from 'mongoose';
import { User, type UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersRepository {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  findByEmail(email: string) {
    return this.userModel.findOne({ email: email.toLowerCase().trim() });
  }

  findById(id: string | Types.ObjectId) {
    return this.userModel.findById(id).select('-password').populate('currency');
  }

  findByIdWithPassword(id: string | Types.ObjectId) {
    return this.userModel.findById(id).populate('currency');
  }

  create(payload: Partial<User>) {
    return this.userModel.create(payload);
  }

  updateById(id: string, payload: UpdateQuery<UserDocument>) {
    return this.userModel.findByIdAndUpdate(id, payload, { new: true }).select('-password');
  }

  list(filter: FilterQuery<UserDocument>, skip = 0, limit = 20) {
    return this.userModel
      .find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  count(filter: FilterQuery<UserDocument>) {
    return this.userModel.countDocuments(filter);
  }
}
