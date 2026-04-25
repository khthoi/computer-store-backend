import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { ProductImage } from './entities/product-image.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { slugify } from '../../common/helpers/slugify';
import { BrandsService } from '../brands/brands.service';
import { ProductListResponse, mapProductListResponse } from './dto/product-response.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductVariant) private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(ProductImage) private readonly imageRepo: Repository<ProductImage>,
    private readonly brandsService: BrandsService,
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
    return saved;
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['danhMuc', 'variants', 'variants.images'],
    });
    if (!product) throw new NotFoundException('Sản phẩm không tồn tại');
    return product;
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
    Object.assign(product, rest);
    const saved = await this.productRepo.save(product);
    if (brandIds !== undefined) {
      await this.brandsService.setProductBrands(saved.id, brandIds ?? []);
    }
    return saved;
  }

  async remove(id: number): Promise<void> {
    const product = await this.findOne(id);
    // Soft delete: đặt trang_thai = NgungBan nếu đã có đơn hàng
    product.trangThai = 'NgungBan';
    await this.productRepo.save(product);
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
    return this.variantRepo.save(variant);
  }

  async setDefaultVariant(productId: number, variantId: number): Promise<ProductVariant> {
    const variant = await this.variantRepo.findOne({ where: { id: variantId, sanPhamId: productId } });
    if (!variant) throw new NotFoundException('Biến thể không tồn tại hoặc không thuộc sản phẩm này');
    await this.variantRepo.update({ sanPhamId: productId }, { isMacDinh: false });
    variant.isMacDinh = true;
    return this.variantRepo.save(variant);
  }

  async updateVariant(variantId: number, dto: Partial<import('./dto/create-product.dto').CreateVariantDto>): Promise<ProductVariant> {
    const variant = await this.variantRepo.findOne({ where: { id: variantId } });
    if (!variant) throw new NotFoundException('Biến thể không tồn tại');
    if (dto.sku && dto.sku !== variant.sku) {
      const exists = await this.variantRepo.findOne({ where: { sku: dto.sku } });
      if (exists) throw new ConflictException(`SKU "${dto.sku}" đã tồn tại`);
    }
    Object.assign(variant, dto);
    return this.variantRepo.save(variant);
  }

  async removeVariant(variantId: number): Promise<void> {
    const variant = await this.variantRepo.findOne({ where: { id: variantId } });
    if (!variant) throw new NotFoundException('Biến thể không tồn tại');
    variant.trangThai = 'An';
    await this.variantRepo.save(variant);
  }

  // ── Images ────────────────────────────────────────────────────────────────

  async addImage(phienBanId: number, data: Partial<ProductImage>): Promise<ProductImage> {
    const variant = await this.variantRepo.findOne({ where: { id: phienBanId } });
    if (!variant) throw new NotFoundException('Biến thể không tồn tại');
    const image = this.imageRepo.create({ ...data, phienBanId });
    return this.imageRepo.save(image);
  }

  async removeImage(imageId: number): Promise<void> {
    const image = await this.imageRepo.findOne({ where: { id: imageId } });
    if (!image) throw new NotFoundException('Hình ảnh không tồn tại');
    await this.imageRepo.remove(image);
  }

  // ── Clone ─────────────────────────────────────────────────────────────────

  async cloneProduct(id: number, employeeId: number): Promise<import('./dto/product-response.dto').ProductListResponse> {
    const source = await this.findOne(id);
    const brands = await this.brandsService.getProductBrands(source.id);

    const newSlug = await this.makeUniqueSlug(`${source.slug}-copy`);
    const newMa = await this.makeUniqueMa(`${source.maSanPham}-COPY`);

    const clonedVariants = source.variants.map((v, i) =>
      this.variantRepo.create({
        tenPhienBan: v.tenPhienBan,
        sku: `${v.sku}-copy-${i}`,
        giaGoc: v.giaGoc,
        giaBan: v.giaBan,
        trongLuong: v.trongLuong,
        trangThai: 'An',
        isMacDinh: i === 0,
        soLuongTon: 0,
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
      trangThai: 'An',
      isMacDinh: false,
      soLuongTon: 0,
    });

    const saved = await this.variantRepo.save(clone);
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
