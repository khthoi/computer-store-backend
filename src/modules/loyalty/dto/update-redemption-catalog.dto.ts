import { PartialType } from '@nestjs/swagger';
import { CreateRedemptionCatalogDto } from './create-redemption-catalog.dto';

export class UpdateRedemptionCatalogDto extends PartialType(CreateRedemptionCatalogDto) {}
