import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompatibilityRule } from './entities/compatibility-rule.entity';
import { SpecValue } from '../specifications/entities/spec-value.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Category } from '../categories/entities/category.entity';
import { CheckCompatibilityDto } from './dto/check-compatibility.dto';

export interface CompatibilityIssue {
  id: string;
  ruleId: number | null;
  part1: string;
  part2: string;
  /** Variant IDs of all parts implicated by this issue — used by UI to highlight cards. */
  variantIds: number[];
  reason: string;
  severity: 'error' | 'warning';
}

export interface CompatibilityResult {
  compatible: boolean;
  issues: CompatibilityIssue[];
}

@Injectable()
export class BuildPcCompatibilityEngine {
  constructor(
    @InjectRepository(CompatibilityRule) private readonly ruleRepo: Repository<CompatibilityRule>,
    @InjectRepository(SpecValue) private readonly specValueRepo: Repository<SpecValue>,
    @InjectRepository(ProductVariant) private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(Category) private readonly categoryRepo: Repository<Category>,
  ) {}

  /**
   * Spec values may be stored as rich-text HTML (e.g. "<p>DDR5</p>") in giaTriThongSo,
   * while giaTriChuan holds the canonical token used for comparisons. Prefer the
   * canonical value; fall back to stripping tags from the display value.
   */
  private pickSpecVal(sv: SpecValue | undefined): string {
    if (!sv) return '';
    const canonical = sv.giaTriChuan?.trim();
    if (canonical) return canonical;
    return (sv.giaTriThongSo ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /** BFS: returns rootId + all descendant category IDs. */
  private async resolveDescendantIds(rootId: number): Promise<Set<number>> {
    const result = new Set<number>([rootId]);
    let frontier = [rootId];
    while (frontier.length > 0) {
      const children = await this.categoryRepo
        .createQueryBuilder('c')
        .select('c.id', 'id')
        .where('c.danhMucChaId IN (:...ids)', { ids: frontier })
        .getRawMany<{ id: number }>();
      const next: number[] = [];
      for (const c of children) {
        if (!result.has(c.id)) {
          result.add(c.id);
          next.push(c.id);
        }
      }
      frontier = next;
    }
    return result;
  }

  async check(dto: CheckCompatibilityDto): Promise<CompatibilityResult> {
    if (!dto.phienBanIds?.length) return { compatible: true, issues: [] };

    // Quantity per phienBanId (defaults to 1). Multiple entries of the same id are summed.
    const qtyById = new Map<number, number>();
    for (let i = 0; i < dto.phienBanIds.length; i++) {
      const id = dto.phienBanIds[i];
      const qty = Math.max(1, Math.floor(dto.soLuongs?.[i] ?? 1));
      qtyById.set(id, (qtyById.get(id) ?? 0) + qty);
    }
    const uniqueIds = Array.from(qtyById.keys());

    const variants = await this.variantRepo
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.product', 'sp')
      .leftJoinAndSelect('sp.danhMuc', 'dm')
      .whereInIds(uniqueIds)
      .getMany();

    const rules = await this.ruleRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.slotNguon', 'sn')
      .leftJoinAndSelect('r.slotDich', 'sd')
      .where('r.isActive = 1')
      .orderBy('r.thuTu', 'ASC')
      .getMany();

    const allMaKt = new Set<string>();
    for (const r of rules) {
      allMaKt.add(r.maKtNguon);
      if (r.maKtDich) allMaKt.add(r.maKtDich);
    }

    const specValues = allMaKt.size === 0 ? [] : await this.specValueRepo
      .createQueryBuilder('sv')
      .leftJoinAndSelect('sv.loaiThongSo', 'lts')
      .where('sv.phienBanId IN (:...ids)', { ids: uniqueIds })
      .andWhere('lts.maKyThuat IN (:...keys)', { keys: Array.from(allMaKt) })
      .getMany();

    const specIndex = new Map<string, SpecValue>();
    for (const sv of specValues) {
      specIndex.set(`${sv.phienBanId}::${sv.loaiThongSo?.maKyThuat ?? ''}`, sv);
    }

    // Pre-resolve category subtrees once per unique slot category. Products may
    // live in sub-categories of the slot's configured category, so we need the
    // full descendant set to filter variants — not just exact-equality match.
    const catRoots = new Set<number>();
    for (const r of rules) {
      catRoots.add(r.slotNguon.danhMucId);
      if (r.slotDich) catRoots.add(r.slotDich.danhMucId);
    }
    const descendantsByRoot = new Map<number, Set<number>>();
    await Promise.all(
      Array.from(catRoots).map(async (rootId) => {
        descendantsByRoot.set(rootId, await this.resolveDescendantIds(rootId));
      }),
    );

    const issues: CompatibilityIssue[] = [];

    for (const rule of rules) {
      const srcCats = descendantsByRoot.get(rule.slotNguon.danhMucId)!;
      const sourceVariants = variants.filter(
        (v) => v.product?.danhMucId != null && srcCats.has(v.product.danhMucId),
      );
      if (sourceVariants.length === 0) continue;

      const dstCats = rule.slotDich ? descendantsByRoot.get(rule.slotDich.danhMucId) : undefined;
      const destVariants = rule.slotDichId != null && dstCats
        ? variants.filter((v) => v.product?.danhMucId != null && dstCats.has(v.product.danhMucId))
        : [];

      if (rule.slotDichId != null && destVariants.length === 0) continue;

      for (const sourceV of sourceVariants) {
        const sourceVal = this.pickSpecVal(specIndex.get(`${sourceV.id}::${rule.maKtNguon}`));
        if (!sourceVal) continue;

        const passed = this.evaluateRule(rule, sourceVal, destVariants, specIndex, qtyById);
        if (!passed.ok) {
          issues.push({
            id: `rule-${rule.id}-v${sourceV.id}`,
            ruleId: rule.id,
            part1: sourceV.tenPhienBan,
            part2: passed.againstName,
            variantIds: [sourceV.id, ...passed.againstIds],
            reason: rule.thongBaoLoi || rule.tenQuyTac,
            severity: rule.batBuoc ? 'error' : 'warning',
          });
        }
      }
    }

    return { compatible: issues.every((i) => i.severity !== 'error'), issues };
  }

  private evaluateRule(
    rule: CompatibilityRule,
    sourceVal: string,
    destVariants: ProductVariant[],
    specIndex: Map<string, SpecValue>,
    qtyById: Map<number, number>,
  ): { ok: boolean; againstName: string; againstIds: number[] } {
    const normSrc = sourceVal.trim().toLowerCase();
    const heSo = Number(rule.heSo) || 1;

    if (rule.loaiKiemTra === 'min_sum') {
      let sum = 0;
      const names: string[] = [];
      const ids: number[] = [];
      for (const d of destVariants) {
        const v = this.pickSpecVal(specIndex.get(`${d.id}::${rule.maKtDich}`));
        if (v) {
          const qty = qtyById.get(d.id) ?? 1;
          sum += (Number(v) || 0) * qty;
          names.push(qty > 1 ? `${d.tenPhienBan} × ${qty}` : d.tenPhienBan);
          ids.push(d.id);
        }
      }
      return {
        ok: Number(sourceVal) >= sum * heSo,
        againstName: names.join(', '),
        againstIds: ids,
      };
    }

    if (destVariants.length === 0) {
      const refVal = (rule.giaTriMacDinh ?? '').trim().toLowerCase();
      if (!refVal) return { ok: true, againstName: '', againstIds: [] };
      return {
        ok: this.compareSingle(rule.loaiKiemTra, normSrc, refVal, heSo, sourceVal, refVal),
        againstName: `mặc định: ${refVal}`,
        againstIds: [],
      };
    }

    for (const d of destVariants) {
      const destValRaw = this.pickSpecVal(specIndex.get(`${d.id}::${rule.maKtDich}`));
      if (!destValRaw) continue;
      const ok = this.compareSingle(
        rule.loaiKiemTra,
        normSrc,
        destValRaw.trim().toLowerCase(),
        heSo,
        sourceVal,
        destValRaw,
      );
      if (!ok) return { ok: false, againstName: d.tenPhienBan, againstIds: [d.id] };
    }
    return { ok: true, againstName: '', againstIds: [] };
  }

  private compareSingle(
    loaiKiemTra: string,
    normSrc: string,
    normDest: string,
    heSo: number,
    rawSrc: string,
    rawDest: string,
  ): boolean {
    if (loaiKiemTra === 'exact_match') return normSrc === normDest;
    if (loaiKiemTra === 'contains') {
      const list = normDest.split(/[,;|/]/).map((s) => s.trim()).filter(Boolean);
      return list.length > 0 ? list.includes(normSrc) : normDest.includes(normSrc);
    }
    if (loaiKiemTra === 'min_value') {
      const s = Number(rawSrc);
      const d = Number(rawDest);
      if (Number.isNaN(s) || Number.isNaN(d)) return false;
      return d >= s * heSo;
    }
    return true;
  }
}
