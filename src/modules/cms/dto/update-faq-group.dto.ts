import { PartialType } from '@nestjs/swagger';
import { CreateFaqGroupDto } from './create-faq-group.dto';

export class UpdateFaqGroupDto extends PartialType(CreateFaqGroupDto) {}
