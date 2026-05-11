import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { slugify } from '../../common/helpers/slugify';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly repo: Repository<Category>,
    private readonly dataSource: DataSource,
    private readonly auditLogsService: AuditLogsService,
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
    const saved = await this.repo.save(category);
    this.auditLogsService.log({
      entityType: 'DanhMuc',
      entityId: String(saved.id),
      entityLabel: saved.tenDanhMuc,
      actionType: 'TaoMoi',
      actionDetail: `Tạo danh mục "${saved.tenDanhMuc}" (slug: ${saved.slug}, cấp: ${saved.capDoHienThi}${saved.danhMucChaId ? ', danh mục cha #' + saved.danhMucChaId : ''})`,
      after: JSON.stringify({
        id: saved.id,
        tenDanhMuc: saved.tenDanhMuc,
        slug: saved.slug,
        nodeType: saved.nodeType,
        capDoHienThi: saved.capDoHienThi,
        danhMucChaId: saved.danhMucChaId,
        trangThai: saved.trangThai,
      }),
    });
    return saved;
  }

  async getTree(): Promise<Category[]> {
    const all = await this.repo.find({
      where: { trangThai: 'Hien' },
      order: { thuTuHienThi: 'ASC' },
    });

    const map = new Map<number, Category>();
    for (const cat of all) {
      cat.children = [];
      map.set(cat.id, cat);
    }

    const roots: Category[] = [];
    for (const cat of all) {
      if (cat.danhMucChaId == null) {
        roots.push(cat);
      } else {
        map.get(cat.danhMucChaId)?.children.push(cat);
      }
    }

    return roots;
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
    const before = {
      tenDanhMuc: cat.tenDanhMuc,
      slug: cat.slug,
      trangThai: cat.trangThai,
      capDoHienThi: cat.capDoHienThi,
      danhMucChaId: cat.danhMucChaId,
      moTa: cat.moTa,
      hinhAnh: cat.hinhAnh,
    };

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
    const updated = await this.repo.save(cat);
    this.auditLogsService.log({
      entityType: 'DanhMuc',
      entityId: String(id),
      entityLabel: updated.tenDanhMuc,
      actionType: 'CapNhat',
      actionDetail: `Cập nhật danh mục "${updated.tenDanhMuc}"`,
      before: JSON.stringify(before),
      after: JSON.stringify({
        tenDanhMuc: updated.tenDanhMuc,
        slug: updated.slug,
        trangThai: updated.trangThai,
        capDoHienThi: updated.capDoHienThi,
        danhMucChaId: updated.danhMucChaId,
        moTa: updated.moTa,
        hinhAnh: updated.hinhAnh,
      }),
    });
    return updated;
  }

  async remove(id: number): Promise<void> {
    const cat = await this.findOne(id);
    if (cat.children?.length) {
      throw new BadRequestException('Không thể xoá danh mục có danh mục con');
    }
    await this.repo.remove(cat);
    this.auditLogsService.log({
      entityType: 'DanhMuc',
      entityId: String(id),
      entityLabel: cat.tenDanhMuc,
      actionType: 'Xoa',
      actionDetail: `Xóa danh mục "${cat.tenDanhMuc}" (slug: ${cat.slug}, cấp: ${cat.capDoHienThi})`,
      before: JSON.stringify({
        id,
        tenDanhMuc: cat.tenDanhMuc,
        slug: cat.slug,
        capDoHienThi: cat.capDoHienThi,
        danhMucChaId: cat.danhMucChaId,
        trangThai: cat.trangThai,
      }),
    });
  }

  async reorderCategories(orderedIds: number[]): Promise<void> {
    await Promise.all(
      orderedIds.map((id, idx) => this.repo.update({ id }, { thuTuHienThi: idx })),
    );
    this.auditLogsService.log({
      entityType: 'DanhMuc',
      entityId: 'batch',
      entityLabel: 'Sắp xếp lại danh mục',
      actionType: 'CapNhat',
      actionDetail: `Sắp xếp lại thứ tự hiển thị ${orderedIds.length} danh mục`,
      after: JSON.stringify({ newOrder: orderedIds }),
    });
  }

  async getProductCountMap(): Promise<Map<number, number>> {
    const rows: { danh_muc_id: number; cnt: string }[] = await this.dataSource.query(
      'SELECT danh_muc_id, COUNT(*) AS cnt FROM san_pham GROUP BY danh_muc_id',
    );
    return new Map(rows.map((r) => [Number(r.danh_muc_id), Number(r.cnt)]));
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
