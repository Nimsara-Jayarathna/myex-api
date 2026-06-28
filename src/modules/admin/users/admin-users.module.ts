import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../../users/schemas/user.schema';
import { AdminUsersRepository } from './admin-users.repository';
import { AdminUsersService } from './admin-users.service';
import { EmailModule } from '../../email/email.module';

@Module({
  imports: [EmailModule, MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  providers: [AdminUsersRepository, AdminUsersService],
  exports: [AdminUsersService],
})
export class AdminUsersModule {}
