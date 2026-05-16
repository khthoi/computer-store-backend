import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { MediaAsset } from './entities/media-asset.entity';
import { MediaFolderService } from './media-folder.service';
import { QueryMediaDto } from './dto/query-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

const RAW_RENDERABLE_IMAGE_EXTENSIONS = new Set([
  '.svg',
  '.svgz',
  '.ico',
  '.icon',
]);

function decodeOriginalName(file: Express.Multer.File): string {
  return Buffer.from(file.originalname, 'latin1').toString('utf8');
}

function getFileExtension(filename: string): string {
  const cleanName = filename.split(/[?#]/, 1)[0].toLowerCase();
  const dotIndex = cleanName.lastIndexOf('.');
  return dotIndex >= 0 ? cleanName.slice(dotIndex) : '';
}

function getBaseName(filename: string): string {
  const name = filename.split(/[\\/]/).pop() ?? 'file';
  const dotIndex = name.lastIndexOf('.');
  return dotIndex > 0 ? name.slice(0, dotIndex) : name;
}

function sanitizePublicIdSegment(value: string): string {
  return (
    value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'file'
  );
}

function isRenderableImageFile(
  file: Express.Multer.File,
  originalName: string,
): boolean {
  return (
    file.mimetype.startsWith('image/') ||
    RAW_RENDERABLE_IMAGE_EXTENSIONS.has(getFileExtension(originalName))
  );
}

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(MediaAsset)
    private readonly repo: Repository<MediaAsset>,
    private readonly config: ConfigService,
    private readonly folderService: MediaFolderService,
    private readonly auditLogsService: AuditLogsService,
  ) {
    cloudinary.config({
      cloud_name: config.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: config.get<string>('CLOUDINARY_API_KEY'),
      api_secret: config.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async upload(
    file: Express.Multer.File,
    employeeId: number,
    options?: {
      folderPath?: string;
      thuMucId?: number;
      altText?: string;
      caption?: string;
    },
  ): Promise<MediaAsset> {
    const {
      folderPath,
      thuMucId: thuMucIdParam,
      altText,
      caption,
    } = options ?? {};
    const originalName = decodeOriginalName(file);
    let targetFolder = 'pc-store/misc';
    let thuMucId: number | null = null;
    let phamVi = 'public';

    if (thuMucIdParam) {
      const configured = await this.folderService.findOne(thuMucIdParam);
      if (configured.loaiChoPhep !== 'all') {
        const fileType = isRenderableImageFile(file, originalName)
          ? 'image'
          : file.mimetype.startsWith('video/')
            ? 'video'
            : 'raw';
        if (configured.loaiChoPhep !== fileType) {
          throw new BadRequestException(
            `Thư mục này chỉ chấp nhận loại file: ${configured.loaiChoPhep}`,
          );
        }
      }
      targetFolder = configured.duongDan;
      thuMucId = configured.id;
      phamVi = configured.phamVi ?? 'public';
    } else if (folderPath) {
      const configured = await this.folderService.findByPath(folderPath);
      if (!configured) {
        throw new BadRequestException(
          `Thư mục "${folderPath}" không được cấu hình. Chọn thư mục hợp lệ từ danh sách.`,
        );
      }
      if (configured.loaiChoPhep !== 'all') {
        const fileType = isRenderableImageFile(file, originalName)
          ? 'image'
          : file.mimetype.startsWith('video/')
            ? 'video'
            : 'raw';
        if (configured.loaiChoPhep !== fileType) {
          throw new BadRequestException(
            `Thư mục này chỉ chấp nhận loại file: ${configured.loaiChoPhep}`,
          );
        }
      }
      targetFolder = configured.duongDan;
      thuMucId = configured.id;
      phamVi = configured.phamVi ?? 'public';
    }

    const result = await this.uploadToCloudinary(
      file,
      targetFolder,
      originalName,
    );

    const loaiFile = (
      isRenderableImageFile(file, originalName)
        ? 'image'
        : result.resource_type === 'image'
          ? 'image'
          : result.resource_type === 'video'
            ? 'video'
            : 'raw'
    ) as string;

    const asset = this.repo.create({
      cloudinaryId: result.public_id as string,
      cloudinaryVer: result.version as number,
      urlGoc: result.secure_url as string,
      tenFileGoc: originalName,
      loaiFile,
      mimeType: file.mimetype,
      kichThuocByte: file.size,
      chieuRong: (result.width as number) ?? null,
      chieuCao: (result.height as number) ?? null,
      altText: altText ?? null,
      caption: caption ?? null,
      thuMuc: targetFolder,
      thuMucId,
      trangThai: 'active',
      phamVi,
      nguoiUploadId: employeeId,
    });

    const saved = await this.repo.save(asset);
    const uploaded = await this.findOne(saved.id);
    this.auditLogsService.log({
      entityType: 'MediaAsset',
      entityId: String(uploaded.id),
      entityLabel: uploaded.tenFileGoc,
      actionType: 'TaoMoi',
      actionDetail: `Upload file "${uploaded.tenFileGoc}" vào thư mục ${uploaded.thuMuc}`,
      after: JSON.stringify({ id: uploaded.id, tenFileGoc: uploaded.tenFileGoc, thuMuc: uploaded.thuMuc, loaiFile: uploaded.loaiFile }),
    });
    return uploaded;
  }

  /**
   * Lightweight customer-side upload — bypasses folder-config validation and
   * audit logging (those are admin concerns) but still lands the file in
   * Cloudinary + creates a `media_asset` row so downstream junction tables
   * (e.g. `yeu_cau_doi_tra_asset`) can reference it by id like any other asset.
   *
   * `nguoiUploadId` is left null since the uploader isn't an employee.
   */
  async uploadCustomerEvidence(
    file: Express.Multer.File,
    options?: { folder?: string; altText?: string },
  ): Promise<MediaAsset> {
    if (!file?.buffer || file.size === 0) {
      throw new BadRequestException('Tệp tải lên không hợp lệ');
    }
    if (!file.mimetype?.startsWith('image/') && !file.mimetype?.startsWith('video/')) {
      throw new BadRequestException(`Tệp "${file.originalname}" không phải ảnh hoặc video`);
    }
    const originalName = decodeOriginalName(file);
    const folder = options?.folder ?? 'pc-store/returns';
    const result = await this.uploadToCloudinary(file, folder, originalName);

    const loaiFile = isRenderableImageFile(file, originalName)
      ? 'image'
      : result.resource_type === 'image'
        ? 'image'
        : result.resource_type === 'video'
          ? 'video'
          : 'raw';

    const asset = this.repo.create({
      cloudinaryId: result.public_id as string,
      cloudinaryVer: result.version as number,
      urlGoc: result.secure_url as string,
      tenFileGoc: originalName,
      loaiFile,
      mimeType: file.mimetype,
      kichThuocByte: file.size,
      chieuRong: (result.width as number) ?? null,
      chieuCao: (result.height as number) ?? null,
      altText: options?.altText ?? null,
      caption: null,
      thuMuc: folder,
      thuMucId: null,
      trangThai: 'active',
      phamVi: 'public',
      nguoiUploadId: null,
    });
    return this.repo.save(asset);
  }

  async findAll(query: QueryMediaDto) {
    const {
      page = 1,
      limit = 20,
      search,
      loaiFile,
      trangThai,
      thuMucId,
    } = query;
    const qb = this.repo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.nguoiUpload', 'nv')
      .leftJoinAndSelect('a.thuMucObj', 'tm')
      .orderBy('a.ngayUpload', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    qb.andWhere('a.phamVi = :phamVi', { phamVi: 'public' });
    if (search) qb.andWhere('a.tenFileGoc LIKE :s', { s: `%${search}%` });
    if (loaiFile) qb.andWhere('a.loaiFile = :loaiFile', { loaiFile });
    if (trangThai) qb.andWhere('a.trangThai = :trangThai', { trangThai });
    if (thuMucId) qb.andWhere('a.thuMucId = :thuMucId', { thuMucId });

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number): Promise<MediaAsset> {
    const asset = await this.repo.findOne({
      where: { id },
      relations: ['nguoiUpload', 'thuMucObj'],
    });
    if (!asset) throw new NotFoundException('Asset không tồn tại');
    return asset;
  }

  async remove(id: number): Promise<void> {
    const asset = await this.findOne(id);
    if (asset.soLanSuDung > 0) {
      throw new BadRequestException('Asset đang được sử dụng, không thể xoá');
    }
    const snapshot = { id: asset.id, tenFileGoc: asset.tenFileGoc, cloudinaryId: asset.cloudinaryId, loaiFile: asset.loaiFile, thuMuc: asset.thuMuc };
    await cloudinary.uploader.destroy(asset.cloudinaryId, {
      resource_type: asset.loaiFile as 'image' | 'video' | 'raw',
    });
    await this.repo.remove(asset);
    this.auditLogsService.log({
      entityType: 'MediaAsset',
      entityId: String(snapshot.id),
      entityLabel: snapshot.tenFileGoc,
      actionType: 'Xoa',
      actionDetail: `Xóa file media "${snapshot.tenFileGoc}" khỏi Cloudinary`,
      before: JSON.stringify(snapshot),
    });
  }

  async update(id: number, dto: UpdateMediaDto): Promise<MediaAsset> {
    const asset = await this.findOne(id);
    const before = { tenFileGoc: asset.tenFileGoc, altText: asset.altText, caption: asset.caption };
    if (dto.originalName !== undefined) asset.tenFileGoc = dto.originalName;
    if (dto.altText !== undefined) asset.altText = dto.altText;
    if (dto.caption !== undefined) asset.caption = dto.caption;
    const saved = await this.repo.save(asset);
    this.auditLogsService.log({
      entityType: 'MediaAsset',
      entityId: String(id),
      entityLabel: saved.tenFileGoc,
      actionType: 'CapNhat',
      actionDetail: `Cập nhật thông tin file media #${id}`,
      before: JSON.stringify(before),
      after: JSON.stringify({ tenFileGoc: saved.tenFileGoc, altText: saved.altText, caption: saved.caption }),
    });
    return saved;
  }

  async archive(id: number): Promise<MediaAsset> {
    const asset = await this.findOne(id);
    const before = { trangThai: asset.trangThai };
    asset.trangThai = 'archived';
    const saved = await this.repo.save(asset);
    this.auditLogsService.log({
      entityType: 'MediaAsset',
      entityId: String(id),
      entityLabel: saved.tenFileGoc,
      actionType: 'CapNhat',
      actionDetail: `Archive file media "${saved.tenFileGoc}"`,
      before: JSON.stringify(before),
      after: JSON.stringify({ trangThai: 'archived' }),
    });
    return saved;
  }

  private uploadToCloudinary(
    file: Express.Multer.File,
    folder: string,
    originalName: string,
  ): Promise<Record<string, unknown>> {
    // Cloudinary raw assets need the extension in public_id; otherwise delivery
    // URLs like /raw/upload/.../file_qczdto are served as opaque downloads.
    const extension = getFileExtension(originalName);
    const uploadAsRawImage = RAW_RENDERABLE_IMAGE_EXTENSIONS.has(extension);

    const opts = uploadAsRawImage
      ? {
          folder,
          resource_type: 'raw' as const,
          public_id: `${sanitizePublicIdSegment(getBaseName(originalName))}-${Date.now()}${extension}`,
          use_filename: false,
          unique_filename: false,
        }
      : { folder, resource_type: 'auto' as const };

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        opts,
        (error, result) => {
          if (error) {
            const messageValue =
              typeof error === 'object' && 'message' in error
                ? (error as { message: unknown }).message
                : undefined;
            const message =
              typeof messageValue === 'string'
                ? messageValue
                : 'Cloudinary upload failed';
            return reject(new Error(message));
          }
          resolve(result as Record<string, unknown>);
        },
      );
      stream.end(file.buffer);
    });
  }
}
