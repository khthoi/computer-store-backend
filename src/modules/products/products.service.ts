import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { ProductImage, LoaiAnh } from './entities/product-image.entity';
import { SpecValue } from '../specifications/entities/spec-value.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { slugify } from '../../common/helpers/slugify';
import { BrandsService } from '../brands/brands.service';
import { ProductListResponse, mapProductListResponse } from './dto/product-response.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductVariant) private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(ProductImage) private readonly imageRepo: Repository<ProductImage>,
    @InjectRepository(SpecValue) private readonly specValueRepo: Repository<SpecValue>,
    private readonly brandsService: BrandsService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(dto: CreateProductDto, employeeId: number): Promise<Product> {
    const slug = dto.slug ?? slugify(dto.tenSanPham);
    await this.assertSlugUnique(slug);
    await this.assertMaUnique(dto.maSanPham);

    const { brandIds, ...productData } = dto;

    const variantDtos = dto.variants ?? [];
    if (variantDtos.length > 0 && !variantDtos.some((v) => v.isMacDinh)) {
      variantDtos[0] = { ...variantDtos[0], isMacDinh: true };
    }

    const product = this.productRepo.create({
      ...productData,
      slug,
      nguoiTaoId: employeeId,
      variants: variantDtos.map((v) => this.variantRepo.create(v)),
    });

    const saved = await this.productRepo.save(product);
    if (brandIds?.length) {
      await this.brandsService.setProductBrands(saved.id, brandIds);
    }

    this.auditLogsService.log({
      entityType: 'SanPham',
      entityId: String(saved.id),
      entityLabel: saved.tenSanPham,
      actionType: 'TaoMoi',
      actionDetail: `Tạo ${saved.tenSanPham}`,
    });

    return saved;
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['danhMuc', 'variants', 'variants.images', 'variants.stockLevel'],
    });
    if (!product) throw new NotFoundException('Sản phẩm không tồn tại');
    return product;
  }

  async findProductCategoryId(productId: number): Promise<number> {
    const product = await this.productRepo.findOne({ where: { id: productId }, select: ['id', 'danhMucId'] });
    if (!product) throw new NotFoundException('Sản phẩm không tồn tại');
    return product.danhMucId;
  }

  async findOneAdmin(id: number): Promise<ProductListResponse> {
    const product = await this.findOne(id);
    const brands = await this.brandsService.getProductBrands(product.id);
    return mapProductListResponse(product, brands);
  }

  async findBySlug(slug: string): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { slug, trangThai: 'DangBan' },
      relations: ['variants', 'variants.images'],
    });
    if (!product) throw new NotFoundException('Sản phẩm không tồn tại');
    return product;
  }

  async update(id: number, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    const beforeStatus = product.trangThai;

    if (dto.slug && dto.slug !== product.slug) await this.assertSlugUnique(dto.slug);
    if (dto.tenSanPham && !dto.slug) {
      const newSlug = slugify(dto.tenSanPham);
      if (newSlug !== product.slug) {
        await this.assertSlugUnique(newSlug);
        dto.slug = newSlug;
      }
    }
    if (dto.maSanPham && dto.maSanPham !== product.maSanPham) {
      await this.assertMaUnique(dto.maSanPham);
    }

    const { variants: _v, brandIds, ...rest } = dto;
    if (Object.keys(rest).length) await this.productRepo.update(id, rest);
    if (brandIds !== undefined) {
      await this.brandsService.setProductBrands(id, brandIds ?? []);
    }
    const result = await this.findOne(id);

    const isStatusChange = dto.trangThai !== undefined && dto.trangThai !== beforeStatus;
    this.auditLogsService.log({
      entityType: 'SanPham',
      entityId: String(id),
      entityLabel: product.tenSanPham,
      actionType: isStatusChange ? 'DoiTrangThai' : 'CapNhat',
      actionDetail: isStatusChange
        ? `Đổi trạng thái ${beforeStatus} → ${dto.trangThai}`
        : `Cập nhật thông tin ${product.tenSanPham}`,
      before: JSON.stringify({ tenSanPham: product.tenSanPham, trangThai: product.trangThai, maSanPham: product.maSanPham }),
      after: JSON.stringify({ tenSanPham: result.tenSanPham, trangThai: result.trangThai, maSanPham: result.maSanPham }),
    });

    return result;
  }

  async remove(id: number): Promise<void> {
    const product = await this.findOne(id);
    const label = product.tenSanPham;
    const variantIds = product.variants.map((v) => v.id);
    if (variantIds.length > 0) {
      await this.specValueRepo
        .createQueryBuilder()
        .delete()
        .where('phien_ban_id IN (:...ids)', { ids: variantIds })
        .execute();
    }
    await this.productRepo.remove(product);

    this.auditLogsService.log({
      entityType: 'SanPham',
      entityId: String(id),
      entityLabel: label,
      actionType: 'Xoa',
      actionDetail: `Xóa ${label}`,
    });
  }

  // ── Variants ──────────────────────────────────────────────────────────────

  async addVariant(productId: number, dto: import('./dto/create-product.dto').CreateVariantDto): Promise<ProductVariant> {
    await this.findOne(productId);
    const exists = await this.variantRepo.findOne({ where: { sku: dto.sku } });
    if (exists) throw new ConflictException(`SKU "${dto.sku}" đã tồn tại`);

    const existingCount = await this.variantRepo.count({ where: { sanPhamId: productId } });
    const isMacDinh = dto.isMacDinh ?? existingCount === 0;

    if (isMacDinh) {
      await this.variantRepo.update({ sanPhamId: productId }, { isMacDinh: false });
    }

    const variant = this.variantRepo.create({ ...dto, sanPhamId: productId, isMacDinh });
    const saved = await this.variantRepo.save(variant);

    this.auditLogsService.log({
      entityType: 'PhienBan',
      entityId: String(saved.id),
      entityLabel: `${saved.tenPhienBan} (SKU: ${saved.sku})`,
      actionType: 'TaoMoi',
      actionDetail: `Tạo ${saved.tenPhienBan}`,
    });

    return saved;
  }

  async setDefaultVariant(productId: number, variantId: number): Promise<ProductVariant> {
    const variant = await this.variantRepo.findOne({ where: { id: variantId, sanPhamId: productId } });
    if (!variant) throw new NotFoundException('Biến thể không tồn tại hoặc không thuộc sản phẩm này');
    await this.variantRepo.update({ sanPhamId: productId }, { isMacDinh: false });
    const wasMacDinh = variant.isMacDinh;
    variant.isMacDinh = true;
    const saved = await this.variantRepo.save(variant);
    this.auditLogsService.log({
      entityType: 'PhienBan',
      entityId: String(variantId),
      entityLabel: `SKU: ${variant.sku}`,
      actionType: 'CapNhat',
      actionDetail: `Đặt phiên bản "${variant.tenPhienBan}" (SKU: ${variant.sku}) làm mặc định cho sản phẩm #${productId}`,
      before: JSON.stringify({ isMacDinh: wasMacDinh }),
      after:  JSON.stringify({ isMacDinh: true }),
    });
    return saved;
  }

  async updateVariant(variantId: number, dto: Partial<import('./dto/create-product.dto').CreateVariantDto>): Promise<ProductVariant> {
    const variant = await this.variantRepo.findOne({ where: { id: variantId } });
    if (!variant) throw new NotFoundException('Biến thể không tồn tại');
    if (dto.sku && dto.sku !== variant.sku) {
      const exists = await this.variantRepo.findOne({ where: { sku: dto.sku } });
      if (exists) throw new ConflictException(`SKU "${dto.sku}" đã tồn tại`);
    }
    const beforeStatus = variant.trangThai;
    Object.assign(variant, dto);
    const saved = await this.variantRepo.save(variant);

    const isStatusChange = dto.trangThai !== undefined && dto.trangThai !== beforeStatus;
    this.auditLogsService.log({
      entityType: 'PhienBan',
      entityId: String(variantId),
      entityLabel: `${variant.tenPhienBan} (SKU: ${variant.sku})`,
      actionType: isStatusChange ? 'DoiTrangThai' : 'CapNhat',
      actionDetail: isStatusChange
        ? `Đổi trạng thái ${beforeStatus} → ${dto.trangThai}`
        : `Cập nhật thông tin ${variant.tenPhienBan}`,
    });

    return saved;
  }

  async removeVariant(variantId: number): Promise<void> {
    const variant = await this.variantRepo.findOne({ where: { id: variantId }, relations: ['images'] });
    if (!variant) throw new NotFoundException('Biến thể không tồn tại');
    const label = `${variant.tenPhienBan} (SKU: ${variant.sku})`;
    await this.specValueRepo.delete({ phienBanId: variantId });
    await this.variantRepo.remove(variant);

    this.auditLogsService.log({
      entityType: 'PhienBan',
      entityId: String(variantId),
      entityLabel: label,
      actionType: 'Xoa',
      actionDetail: `Xóa ${label}`,
    });
  }

  // ── Images ────────────────────────────────────────────────────────────────

  async findVariantWithImages(productId: number, variantId: number): Promise<ProductVariant> {
    const variant = await this.variantRepo.findOne({
      where: { id: variantId, sanPhamId: productId },
      relations: ['images'],
    });
    if (!variant) throw new NotFoundException('Biến thể không tồn tại');
    return variant;
  }

  async findVariantImages(variantId: number): Promise<ProductImage[]> {
    const variant = await this.variantRepo.findOne({
      where: { id: variantId },
      relations: ['images'],
    });
    if (!variant) throw new NotFoundException('Biến thể không tồn tại');
    return (variant.images ?? []).sort((a, b) => a.thuTu - b.thuTu);
  }

  async saveVariantMedia(variantId: number, items: import('./dto/save-variant-media.dto').MediaItemDto[]): Promise<void> {
    const TYPE_MAP: Record<string, LoaiAnh> = { main: LoaiAnh.AnhChinh, gallery: LoaiAnh.AnhPhu };
    if (items.filter((m) => m.type === 'main').length > 1) {
      throw new BadRequestException('Mỗi biến thể chỉ được có một ảnh chính (AnhChinh)');
    }
    await this.imageRepo.delete({ phienBanId: variantId });
    if (items.length) {
      await this.imageRepo.save(
        items.map((m) =>
          this.imageRepo.create({
            phienBanId: variantId,
            urlHinhAnh: m.url,
            assetId: m.assetId != null ? Number(m.assetId) : null,
            loaiAnh: TYPE_MAP[m.type] ?? LoaiAnh.AnhPhu,
            thuTu: m.order,
            altText: m.altText ?? null,
          }),
        ),
      );
    }
    const anhChinh = items.filter((m) => m.type === 'main').length;
    const anhPhu   = items.filter((m) => m.type !== 'main').length;
    this.auditLogsService.log({
      entityType: 'PhienBan',
      entityId:   String(variantId),
      entityLabel: `Phiên bản #${variantId} — media`,
      actionType: 'CapNhat',
      actionDetail: items.length
        ? `Cập nhật toàn bộ ảnh phiên bản #${variantId} (${anhChinh} ảnh chính, ${anhPhu} ảnh phụ)`
        : `Xóa toàn bộ ảnh phiên bản #${variantId}`,
      after: JSON.stringify({
        variantId,
        count: items.length,
        items: items.map((m) => ({ url: m.url, type: m.type, order: m.order })),
      }),
    });
  }

  async addImage(phienBanId: number, data: Partial<ProductImage>): Promise<ProductImage> {
    const variant = await this.variantRepo.findOne({ where: { id: phienBanId } });
    if (!variant) throw new NotFoundException('Biến thể không tồn tại');
    const image = this.imageRepo.create({ ...data, phienBanId });
    const saved = await this.imageRepo.save(image);
    this.auditLogsService.log({
      entityType: 'HinhAnhSanPham',
      entityId:   String(saved.id),
      entityLabel: `Ảnh phiên bản #${phienBanId}`,
      actionType: 'TaoMoi',
      actionDetail: `Thêm ảnh ${saved.loaiAnh === 'AnhChinh' ? 'chính' : 'phụ'} cho phiên bản #${phienBanId} (url: ${saved.urlHinhAnh}, thứ tự: ${saved.thuTu})`,
      after: JSON.stringify({
        id:          saved.id,
        phienBanId,
        urlHinhAnh:  saved.urlHinhAnh,
        loaiAnh:     saved.loaiAnh,
        thuTu:       saved.thuTu,
        altText:     saved.altText,
      }),
    });
    return saved;
  }

  async removeImage(imageId: number): Promise<void> {
    const image = await this.imageRepo.findOne({ where: { id: imageId } });
    if (!image) throw new NotFoundException('Hình ảnh không tồn tại');
    await this.imageRepo.remove(image);
    this.auditLogsService.log({
      entityType: 'HinhAnhSanPham',
      entityId:   String(imageId),
      entityLabel: `Ảnh phiên bản #${image.phienBanId}`,
      actionType: 'Xoa',
      actionDetail: `Xóa ảnh ${image.loaiAnh === 'AnhChinh' ? 'chính' : 'phụ'} của phiên bản #${image.phienBanId} (url: ${image.urlHinhAnh})`,
      before: JSON.stringify({
        id:         imageId,
        phienBanId: image.phienBanId,
        urlHinhAnh: image.urlHinhAnh,
        loaiAnh:    image.loaiAnh,
        thuTu:      image.thuTu,
        altText:    image.altText,
      }),
    });
  }

  // ── Clone ─────────────────────────────────────────────────────────────────

  async cloneProduct(id: number, employeeId: number): Promise<import('./dto/product-response.dto').ProductListResponse> {
    const source = await this.findOne(id);
    const brands = await this.brandsService.getProductBrands(source.id);

    const newSlug = await this.makeUniqueSlug(`${source.slug}-copy`);
    const newMa = await this.makeUniqueMa(`${source.maSanPham}-COPY`);

    const clonedVariants = await Promise.all(
      source.variants.map(async (v, i) => {
        const sku = await this.makeUniqueSku(`${v.sku}-copy`);
        return this.variantRepo.create({
          tenPhienBan: v.tenPhienBan,
          sku,
          giaGoc: v.giaGoc,
          giaBan: v.giaBan,
          trongLuong: v.trongLuong,
          moTaChiTiet: v.moTaChiTiet,
          trangThai: 'An',
          isMacDinh: i === 0,
        });
      }),
    );

    const clone = this.productRepo.create({
      tenSanPham: `Copy of ${source.tenSanPham}`,
      maSanPham: newMa,
      slug: newSlug,
      danhMucId: source.danhMucId,
      trangThai: 'Nhap',
      nguoiTaoId: employeeId,
      moTaNgan: source.moTaNgan,
      variants: clonedVariants,
    });

    const saved = await this.productRepo.save(clone);
    if (brands.length > 0) {
      await this.brandsService.setProductBrands(saved.id, brands.map((b) => b.id));
    }

    // Copy specs and images for each variant
    const sourceIds = source.variants.map((v) => v.id);
    const allSpecs = sourceIds.length ? await this.specValueRepo.find({ where: { phienBanId: In(sourceIds) } }) : [];
    for (let i = 0; i < source.variants.length; i++) {
      const sv = source.variants[i];
      const newId = saved.variants[i].id;
      const specs = allSpecs.filter((s) => s.phienBanId === sv.id);
      if (specs.length) {
        await this.specValueRepo.save(specs.map(({ id: _i, phienBanId: _p, ...s }) => this.specValueRepo.create({ ...s, phienBanId: newId })));
      }
      if (sv.images?.length) {
        await this.imageRepo.save(sv.images.map(({ id: _i, phienBanId: _p, variant: _v, ...img }) => this.imageRepo.create({ ...img, phienBanId: newId })));
      }
    }

    this.auditLogsService.log({
      entityType: 'SanPham',
      entityId: String(saved.id),
      entityLabel: saved.tenSanPham,
      actionType: 'TaoMoi',
      actionDetail: `Tạo ${saved.tenSanPham}`,
    });

    return this.findOneAdmin(saved.id);
  }

  async cloneVariant(productId: number, variantId: number): Promise<import('./dto/product-response.dto').VariantListResponse> {
    const variant = await this.variantRepo.findOne({
      where: { id: variantId, sanPhamId: productId },
      relations: ['images'],
    });
    if (!variant) throw new NotFoundException('Biến thể không tồn tại');

    const newSku = await this.makeUniqueSku(`${variant.sku}-copy`);

    const clone = this.variantRepo.create({
      sanPhamId: productId,
      tenPhienBan: `Copy of ${variant.tenPhienBan}`,
      sku: newSku,
      giaGoc: variant.giaGoc,
      giaBan: variant.giaBan,
      trongLuong: variant.trongLuong,
      moTaChiTiet: variant.moTaChiTiet,
      trangThai: 'An',
      isMacDinh: false,
    });

    const saved = await this.variantRepo.save(clone);

    const specs = await this.specValueRepo.find({ where: { phienBanId: variantId } });
    if (specs.length) {
      await this.specValueRepo.save(
        specs.map(({ id: _i, phienBanId: _p, ...s }) => this.specValueRepo.create({ ...s, phienBanId: saved.id })),
      );
    }
    if (variant.images?.length) {
      await this.imageRepo.save(
        variant.images.map(({ id: _i, phienBanId: _p, variant: _v, ...img }) => this.imageRepo.create({ ...img, phienBanId: saved.id })),
      );
    }

    this.auditLogsService.log({
      entityType: 'PhienBan',
      entityId: String(saved.id),
      entityLabel: `${saved.tenPhienBan} (SKU: ${saved.sku})`,
      actionType: 'TaoMoi',
      actionDetail: `Tạo ${saved.tenPhienBan}`,
    });

    const full = await this.variantRepo.findOne({ where: { id: saved.id }, relations: ['images'] });
    const { mapVariantListResponse } = await import('./dto/product-response.dto');
    return mapVariantListResponse(full!);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async assertSlugUnique(slug: string): Promise<void> {
    const exists = await this.productRepo.findOne({ where: { slug } });
    if (exists) throw new ConflictException(`Slug "${slug}" đã tồn tại`);
  }

  private async assertMaUnique(maSanPham: string): Promise<void> {
    const exists = await this.productRepo.findOne({ where: { maSanPham } });
    if (exists) throw new ConflictException(`Mã sản phẩm "${maSanPham}" đã tồn tại`);
  }

  private async makeUniqueSlug(base: string): Promise<string> {
    let slug = base;
    let i = 1;
    while (await this.productRepo.findOne({ where: { slug } })) {
      slug = `${base}-${i++}`;
    }
    return slug;
  }

  private async makeUniqueMa(base: string): Promise<string> {
    let ma = base.slice(0, 255);
    let i = 1;
    while (await this.productRepo.findOne({ where: { maSanPham: ma } })) {
      ma = `${base.slice(0, 250)}-${i++}`;
    }
    return ma;
  }

  private async makeUniqueSku(base: string): Promise<string> {
    let sku = base.slice(0, 100);
    let i = 1;
    while (await this.variantRepo.findOne({ where: { sku } })) {
      sku = `${base.slice(0, 95)}-${i++}`;
    }
    return sku;
  }
}
