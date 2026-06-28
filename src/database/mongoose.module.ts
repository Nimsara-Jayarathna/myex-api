import { Module } from '@nestjs/common';
import { DatabaseModule } from './database.module';

@Module({ imports: [DatabaseModule], exports: [DatabaseModule] })
export class AppMongooseModule {}
