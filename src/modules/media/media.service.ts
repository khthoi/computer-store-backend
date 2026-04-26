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

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(MediaAsset)
    private readonly repo: Repository<MediaAsset>,
    private readonly config: ConfigService,
    private readonly folderService: MediaFolderService,
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
    options?: { folderPath?: string; thuMucId?: number; altText?: string; caption?: string },
  ): Promise<MediaAsset> {
    const { folderPath, thuMucId: thuMucIdParam, altText, caption } = options ?? {};
    let targetFolder = 'pc-store/misc';
    let thuMucId: number | null = null;
    let phamVi = 'public';

    if (thuMucIdParam) {
      const configured = await this.folderService.findOne(thuMucIdParam);
      if (configured.loaiChoPhep !== 'all') {
        const fileType = file.mimetype.startsWith('image/') ? 'image'
          : file.mimetype.startsWith('video/') ? 'video' : 'raw';
        if (configured.loaiChoPhep !== fileType) {
          throw new BadRequestException(`Thư mục này chỉ chấp nhận loại file: ${configured.loaiChoPhep}`);
        }
      }
      targetFolder = configured.duongDan;
      thuMucId = configured.id;
      phamVi = configured.phamVi ?? 'public';
    } else if (folderPath) {
      const configured = await this.folderService.findByPath(folderPath);
      if (!configured) {
        throw new BadRequestException(`Thư mục "${folderPath}" không được cấu hình. Chọn thư mục hợp lệ từ danh sách.`);
      }
      if (configured.loaiChoPhep !== 'all') {
        const fileType = file.mimetype.startsWith('image/') ? 'image'
          : file.mimetype.startsWith('video/') ? 'video' : 'raw';
        if (configured.loaiChoPhep !== fileType) {
          throw new BadRequestException(`Thư mục này chỉ chấp nhận loại file: ${configured.loaiChoPhep}`);
        }
      }
      targetFolder = configured.duongDan;
      thuMucId = configured.id;
      phamVi = configured.phamVi ?? 'public';
    }

    const result = await this.uploadToCloudinary(file, targetFolder);

    const loaiFile = (result.resource_type === 'image' ? 'image'
      : result.resource_type === 'video' ? 'video'
      : 'raw') as string;

    const asset = this.repo.create({
      cloudinaryId: result.public_id as string,
      cloudinaryVer: result.version as number,
      urlGoc: result.secure_url as string,
      tenFileGoc: file.originalname,
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

    return this.repo.save(asset);
  }

  async findAll(query: QueryMediaDto) {
    const { page = 1, limit = 20, search, loaiFile, trangThai, thuMucId } = query;
    const qb = this.repo.createQueryBuilder('a')
      .orderBy('a.ngayUpload', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    qb.andWhere('a.phamVi = :phamVi', { phamVi: 'public' });
    if (search) qb.andWhere('a.tenFileGoc LIKE :s', { s: `%${search}%` });
    if (loaiFile) qb.andWhere('a.loaiFile = :loaiFile', { loaiFile });
    if (trangThai) qb.andWhere('a.trangThai = :trangThai', { trangThai });
    if (thuMucId) qb.andWhere('a.thuMucId = :thuMucId', { thuMucId });

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async findOne(id: number): Promise<MediaAsset> {
    const asset = await this.repo.findOne({ where: { id } });
    if (!asset) throw new NotFoundException('Asset không tồn tại');
    return asset;
  }

  async remove(id: number): Promise<void> {
    const asset = await this.findOne(id);
    if (asset.soLanSuDung > 0) {
      throw new BadRequestException('Asset đang được sử dụng, không thể xoá');
    }
    await cloudinary.uploader.destroy(asset.cloudinaryId, {
      resource_type: asset.loaiFile as 'image' | 'video' | 'raw',
    });
    await this.repo.remove(asset);
  }

  async archive(id: number): Promise<MediaAsset> {
    const asset = await this.findOne(id);
    asset.trangThai = 'archived';
    return this.repo.save(asset);
  }

  private uploadToCloudinary(file: Express.Multer.File, folder: string): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'auto' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result as Record<string, unknown>);
        },
      );
      stream.end(file.buffer);
    });
  }
}
