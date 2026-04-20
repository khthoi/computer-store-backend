import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaAsset } from './entities/media-asset.entity';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { AdminMediaController } from './admin-media.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MediaAsset])],
  controllers: [MediaController, AdminMediaController],
  providers: [MediaService],
  exports: [MediaService, TypeOrmModule],
})
export class MediaModule {}
