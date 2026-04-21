import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaAsset } from './entities/media-asset.entity';
import { MediaFolder } from './entities/media-folder.entity';
import { MediaService } from './media.service';
import { MediaFolderService } from './media-folder.service';
import { MediaController } from './media.controller';
import { AdminMediaController } from './admin-media.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MediaAsset, MediaFolder])],
  controllers: [MediaController, AdminMediaController],
  providers: [MediaService, MediaFolderService],
  exports: [MediaService, MediaFolderService, TypeOrmModule],
})
export class MediaModule {}
