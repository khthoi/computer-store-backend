import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaFolder } from './entities/media-folder.entity';
import { CreateMediaFolderDto } from './dto/create-media-folder.dto';
import { UpdateMediaFolderDto } from './dto/update-media-folder.dto';

@Injectable()
export class MediaFolderService {
  constructor(
    @InjectRepository(MediaFolder)
    private readonly repo: Repository<MediaFolder>,
  ) {}

  async findAll(onlyActive = false): Promise<MediaFolder[]> {
    const where = onlyActive ? { isActive: true } : {};
    return this.repo.find({ where, order: { thuTu: 'ASC', tenHienThi: 'ASC' } });
  }

  async findOne(id: number): Promise<MediaFolder> {
    const folder = await this.repo.findOne({ where: { id } });
    if (!folder) throw new NotFoundException('Thư mục không tồn tại');
    return folder;
  }

  async findByPath(path: string): Promise<MediaFolder | null> {
    return this.repo.findOne({ where: { duongDan: path, isActive: true } });
  }

  async create(dto: CreateMediaFolderDto): Promise<MediaFolder> {
    const existing = await this.repo.findOne({ where: { duongDan: dto.duongDan } });
    if (existing) throw new ConflictException('Đường dẫn thư mục đã tồn tại');
    const folder = this.repo.create({
      tenHienThi: dto.tenHienThi,
      duongDan: dto.duongDan,
      moTa: dto.moTa ?? null,
      loaiChoPhep: dto.loaiChoPhep ?? 'all',
      thuTu: dto.thuTu ?? 0,
      isActive: dto.isActive ?? true,
    });
    return this.repo.save(folder);
  }

  async update(id: number, dto: UpdateMediaFolderDto): Promise<MediaFolder> {
    const folder = await this.findOne(id);
    if (dto.duongDan && dto.duongDan !== folder.duongDan) {
      const conflict = await this.repo.findOne({ where: { duongDan: dto.duongDan } });
      if (conflict) throw new ConflictException('Đường dẫn thư mục đã tồn tại');
    }
    Object.assign(folder, dto);
    return this.repo.save(folder);
  }

  async remove(id: number): Promise<void> {
    const folder = await this.findOne(id);
    await this.repo.remove(folder);
  }
}
