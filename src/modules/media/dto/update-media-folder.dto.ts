import { PartialType } from '@nestjs/swagger';
import { CreateMediaFolderDto } from './create-media-folder.dto';

export class UpdateMediaFolderDto extends PartialType(CreateMediaFolderDto) {}
