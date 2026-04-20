import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { BrandsService } from './brands.service';

@ApiTags('Brands')
@Public()
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách thương hiệu đang hiển thị' })
  findAll() {
    return this.brandsService.findAll();
  }
}
