import { Module } from '@nestjs/common';
import { V1Module } from './v1/v1.module';
import { V11Module } from './v1_1/v1_1.module';

@Module({ imports: [V1Module, V11Module] })
export class PublicApiModule {}
