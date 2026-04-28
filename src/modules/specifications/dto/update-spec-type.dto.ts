import { PartialType } from '@nestjs/swagger';
import { CreateSpecTypeDto } from './create-spec-type.dto';

export class UpdateSpecTypeDto extends PartialType(CreateSpecTypeDto) {}
