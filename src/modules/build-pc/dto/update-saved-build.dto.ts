import { PartialType } from '@nestjs/swagger';
import { CreateSavedBuildDto } from './create-saved-build.dto';

export class UpdateSavedBuildDto extends PartialType(CreateSavedBuildDto) {}
