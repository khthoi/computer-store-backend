import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { BrandsService } from './brands.service';

@ApiTags('Brands')
@Public()
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách thương hiệu đang hiển thị' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 1,
          name: 'Intel',
          slug: 'intel',
          logo: 'https://res.cloudinary.com/demo/image/upload/brands/intel-logo.png',
          isVisible: true,
        },
        {
          id: 2,
          name: 'ASUS',
          slug: 'asus',
          logo: 'https://res.cloudinary.com/demo/image/upload/brands/asus-logo.png',
          isVisible: true,
        },
        {
          id: 3,
          name: 'MSI',
          slug: 'msi',
          logo: 'https://res.cloudinary.com/demo/image/upload/brands/msi-logo.png',
          isVisible: true,
        },
      ],
    },
  })
  findAll() {
    return this.brandsService.findAll();
  }
}
