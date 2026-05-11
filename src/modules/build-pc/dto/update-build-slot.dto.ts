import { PartialType } from '@nestjs/swagger';
import { CreateBuildSlotDto } from './create-build-slot.dto';

export class UpdateBuildSlotDto extends PartialType(CreateBuildSlotDto) {}
