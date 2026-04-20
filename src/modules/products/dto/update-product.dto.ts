import { PartialType } from '@nestjs/swagger';
import { CreateProductDto, CreateVariantDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class UpdateVariantDto extends PartialType(CreateVariantDto) {}
