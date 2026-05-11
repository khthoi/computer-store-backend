import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaFolder } from './entities/media-folder.entity';
import { MediaAsset } from './entities/media-asset.entity';
import { CreateMediaFolderDto } from './dto/create-media-folder.dto';
import { UpdateMediaFolderDto } from './dto/update-media-folder.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class MediaFolderService {
  constructor(
    @InjectRepository(MediaFolder)
    private readonly repo: Repository<MediaFolder>,
    @InjectRepository(MediaAsset)
    private readonly assetRepo: Repository<MediaAsset>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAll(onlyActive = false): Promise<(MediaFolder & { fileCount: number })[]> {
    const qb = this.repo.createQueryBuilder('f')
      .where('f.phamVi = :pv', { pv: 'public' })
      .orderBy('f.thuTu', 'ASC')
      .addOrderBy('f.tenHienThi', 'ASC');
    if (onlyActive) qb.andWhere('f.isActive = :active', { active: true });

    const folders = await qb.getMany();

    const counts = await this.assetRepo
      .createQueryBuilder('a')
      .select('a.thuMucId', 'folderId')
      .addSelect('COUNT(*)', 'cnt')
      .where('a.thuMucId IS NOT NULL')
      .andWhere('a.trangThai != :archived', { archived: 'archived' })
      .groupBy('a.thuMucId')
      .getRawMany<{ folderId: number; cnt: string }>();

    const countMap = new Map(counts.map((r) => [Number(r.folderId), Number(r.cnt)]));

    return folders.map((f) => Object.assign(f, { fileCount: countMap.get(f.id) ?? 0 }));
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
      phamVi: dto.phamVi ?? 'public',
    });
    const saved = await this.repo.save(folder);
    this.auditLogsService.log({
      entityType: 'MediaFolder',
      entityId: String(saved.id),
      entityLabel: saved.tenHienThi,
      actionType: 'TaoMoi',
      actionDetail: `Tạo thư mục media "${saved.tenHienThi}" (${saved.duongDan})`,
      after: JSON.stringify({ id: saved.id, tenHienThi: saved.tenHienThi, duongDan: saved.duongDan, phamVi: saved.phamVi }),
    });
    return saved;
  }

  async update(id: number, dto: UpdateMediaFolderDto): Promise<MediaFolder> {
    const folder = await this.findOne(id);
    if (dto.duongDan && dto.duongDan !== folder.duongDan) {
      const conflict = await this.repo.findOne({ where: { duongDan: dto.duongDan } });
      if (conflict) throw new ConflictException('Đường dẫn thư mục đã tồn tại');
    }
    const before = { tenHienThi: folder.tenHienThi, duongDan: folder.duongDan, moTa: folder.moTa, loaiChoPhep: folder.loaiChoPhep, thuTu: folder.thuTu, isActive: folder.isActive, phamVi: folder.phamVi };
    Object.assign(folder, dto);
    const saved = await this.repo.save(folder);
    this.auditLogsService.log({
      entityType: 'MediaFolder',
      entityId: String(id),
      entityLabel: saved.tenHienThi,
      actionType: 'CapNhat',
      actionDetail: `Cập nhật thư mục media "${saved.tenHienThi}"`,
      before: JSON.stringify(before),
      after: JSON.stringify({ tenHienThi: saved.tenHienThi, duongDan: saved.duongDan, moTa: saved.moTa, loaiChoPhep: saved.loaiChoPhep, thuTu: saved.thuTu, isActive: saved.isActive, phamVi: saved.phamVi }),
    });
    return saved;
  }

  async remove(id: number): Promise<void> {
    const folder = await this.findOne(id);
    const snapshot = { id: folder.id, tenHienThi: folder.tenHienThi, duongDan: folder.duongDan, phamVi: folder.phamVi, isActive: folder.isActive };
    await this.repo.remove(folder);
    this.auditLogsService.log({
      entityType: 'MediaFolder',
      entityId: String(snapshot.id),
      entityLabel: snapshot.tenHienThi,
      actionType: 'Xoa',
      actionDetail: `Xóa thư mục media "${snapshot.tenHienThi}" (${snapshot.duongDan})`,
      before: JSON.stringify(snapshot),
    });
  }
}
