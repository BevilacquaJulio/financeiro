import { Global, Module } from '@nestjs/common';
import { ItemsController } from './items.controller';
import { ItemsRepository } from './items.repository';
import { ItemsService } from './items.service';

@Global()
@Module({
  controllers: [ItemsController],
  providers: [ItemsService, ItemsRepository],
  exports: [ItemsRepository],
})
export class ItemsModule {}
