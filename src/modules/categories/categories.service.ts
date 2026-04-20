import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { slugify } from '../../common/helpers/slugify';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly repo: Repository<Category>,
  ) {}

  async create(dto: CreateCategoryDto): Promise<Category> {
    const slug = dto.slug ?? slugify(dto.tenDanhMuc);
    await this.assertSlugUnique(slug);

    if (dto.danhMucChaId) {
      const parent = await this.repo.findOne({ where: { id: dto.danhMucChaId } });
      if (!parent) throw new NotFoundException('Danh mục cha không tồn tại');
    }

    const capDo = dto.danhMucChaId ? await this.getLevel(dto.danhMucChaId) + 1 : 0;

    const category = this.repo.create({
      ...dto,
      slug,
      capDoHienThi: capDo,
    });
    return this.repo.save(category);
  }

  async getTree(): Promise<Category[]> {
    return this.repo.find({
      where: { danhMucChaId: IsNull(), trangThai: 'Hien' },
      relations: ['children', 'children.children'],
      order: { thuTuHienThi: 'ASC' },
    });
  }

  async findAll(): Promise<Category[]> {
    return this.repo.find({ order: { capDoHienThi: 'ASC', thuTuHienThi: 'ASC' } });
  }

  async findBySlug(slug: string): Promise<Category> {
    const cat = await this.repo.findOne({
      where: { slug, trangThai: 'Hien' },
      relations: ['children'],
    });
    if (!cat) throw new NotFoundException('Danh mục không tồn tại');
    return cat;
  }

  async findOne(id: number): Promise<Category> {
    const cat = await this.repo.findOne({ where: { id }, relations: ['parent', 'children'] });
    if (!cat) throw new NotFoundException('Danh mục không tồn tại');
    return cat;
  }

  async update(id: number, dto: UpdateCategoryDto): Promise<Category> {
    const cat = await this.findOne(id);

    if (dto.slug && dto.slug !== cat.slug) {
      await this.assertSlugUnique(dto.slug);
    }
    if (dto.tenDanhMuc && !dto.slug) {
      const newSlug = slugify(dto.tenDanhMuc);
      if (newSlug !== cat.slug) {
        await this.assertSlugUnique(newSlug);
        dto.slug = newSlug;
      }
    }
    if (dto.danhMucChaId && dto.danhMucChaId === id) {
      throw new BadRequestException('Danh mục không thể là cha của chính nó');
    }

    Object.assign(cat, dto);
    return this.repo.save(cat);
  }

  async remove(id: number): Promise<void> {
    const cat = await this.findOne(id);
    if (cat.children?.length) {
      throw new BadRequestException('Không thể xoá danh mục có danh mục con');
    }
    await this.repo.remove(cat);
  }

  private async assertSlugUnique(slug: string): Promise<void> {
    const exists = await this.repo.findOne({ where: { slug } });
    if (exists) throw new ConflictException(`Slug "${slug}" đã tồn tại`);
  }

  private async getLevel(parentId: number): Promise<number> {
    const parent = await this.repo.findOne({ where: { id: parentId } });
    return parent ? parent.capDoHienThi : 0;
  }
}
