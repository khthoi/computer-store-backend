import { PartialType } from '@nestjs/swagger';
import { CreateCompatibilityRuleDto } from './create-compatibility-rule.dto';

export class UpdateCompatibilityRuleDto extends PartialType(CreateCompatibilityRuleDto) {}
