import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Menu } from './entities/menu.entity';
import { MenuItem } from './entities/menu-item.entity';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

export interface MenuItemNode extends MenuItem {
  children: MenuItemNode[];
}

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Menu)
    private readonly menuRepo: Repository<Menu>,
    @InjectRepository(MenuItem)
    private readonly itemRepo: Repository<MenuItem>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async getMenuByPosition(position: string) {
    const menu = await this.menuRepo.findOne({ where: { position } });
    if (!menu) throw new NotFoundException(`Menu '${position}' không tồn tại`);
    const flatItems = await this.itemRepo.find({
      where: { menuId: menu.id, isVisible: true },
      order: { sortOrder: 'ASC' },
    });
    return { ...menu, items: this.buildTree(flatItems) };
  }

  async getAllMenus() {
    const menus = await this.menuRepo.find({ order: { position: 'ASC' } });
    return Promise.all(
      menus.map(async (menu) => {
        const flatItems = await this.itemRepo.find({
          where: { menuId: menu.id },
          order: { sortOrder: 'ASC' },
        });
        const items = this.buildTree(flatItems).map((i) => this.mapItem(i));
        return {
          id: String(menu.id),
          location: menu.position,
          name: menu.name,
          description: null,
          isActive: true,
          createdAt: menu.updatedAt.toISOString(),
          updatedAt: menu.updatedAt.toISOString(),
          items,
        };
      }),
    );
  }

  async reorderItems(menuId: number, itemIds: number[]): Promise<void> {
    for (let i = 0; i < itemIds.length; i++) {
      await this.itemRepo.update({ id: itemIds[i], menuId }, { sortOrder: i + 1 });
    }
    this.auditLogsService.log({
      entityType: 'MenuItem',
      entityId: 'batch',
      entityLabel: `Sắp xếp lại menu #${menuId}`,
      actionType: 'CapNhat',
      actionDetail: `Sắp xếp lại thứ tự ${itemIds.length} mục trong menu #${menuId}`,
      after: JSON.stringify({ menuId, newOrder: itemIds }),
    });
  }

  private mapItem(item: MenuItemNode): Record<string, unknown> {
    return {
      id: String(item.id),
      menuId: String(item.menuId),
      parentId: item.parentId != null ? String(item.parentId) : null,
      label: item.label,
      url: item.url ?? null,
      type: item.type,
      sortOrder: item.sortOrder,
      isVisible: item.isVisible,
      target: item.openInNewTab ? '_blank' : '_self',
      icon: null,
      cssClass: null,
      children: item.children.map((c) => this.mapItem(c)),
    };
  }

  async getMenuItemsByMenu(menuId: number) {
    const menu = await this.menuRepo.findOne({ where: { id: menuId } });
    if (!menu) throw new NotFoundException('Menu không tồn tại');
    const flatItems = await this.itemRepo.find({ where: { menuId }, order: { sortOrder: 'ASC' } });
    return { ...menu, items: this.buildTree(flatItems) };
  }

  async addItem(menuId: number, dto: CreateMenuItemDto) {
    const menu = await this.menuRepo.findOne({ where: { id: menuId } });
    if (!menu) throw new NotFoundException('Menu không tồn tại');
    const saved = await this.itemRepo.save(this.itemRepo.create({ ...dto, menuId }));
    this.auditLogsService.log({
      entityType: 'MenuItem',
      entityId: String(saved.id),
      entityLabel: saved.label,
      actionType: 'TaoMoi',
      actionDetail: `Thêm mục menu "${saved.label}" vào menu #${menuId} (url: ${saved.url}, loại: ${saved.type})`,
      after: JSON.stringify({ id: saved.id, menuId, label: saved.label, url: saved.url, type: saved.type, parentId: saved.parentId, sortOrder: saved.sortOrder, openInNewTab: saved.openInNewTab }),
    });
    return this.mapItem({ ...saved, children: [] });
  }

  async updateItem(menuId: number, itemId: number, dto: UpdateMenuItemDto) {
    const item = await this.itemRepo.findOne({ where: { id: itemId, menuId } });
    if (!item) throw new NotFoundException('Menu item không tồn tại');
    const before = { label: item.label, url: item.url, type: item.type, isVisible: item.isVisible, openInNewTab: item.openInNewTab };
    await this.itemRepo.update(itemId, dto);
    const updated = await this.itemRepo.findOne({ where: { id: itemId } });
    this.auditLogsService.log({
      entityType: 'MenuItem',
      entityId: String(itemId),
      entityLabel: updated!.label,
      actionType: 'CapNhat',
      actionDetail: `Cập nhật mục menu "${updated!.label}" trong menu #${menuId}`,
      before: JSON.stringify(before),
      after: JSON.stringify({ label: updated!.label, url: updated!.url, type: updated!.type, isVisible: updated!.isVisible, openInNewTab: updated!.openInNewTab }),
    });
    return this.mapItem({ ...updated!, children: [] });
  }

  async removeItem(menuId: number, itemId: number) {
    const item = await this.itemRepo.findOne({ where: { id: itemId, menuId } });
    if (!item) throw new NotFoundException('Menu item không tồn tại');
    await this.itemRepo.delete(itemId);
    this.auditLogsService.log({
      entityType: 'MenuItem',
      entityId: String(itemId),
      entityLabel: item.label,
      actionType: 'Xoa',
      actionDetail: `Xóa mục menu "${item.label}" khỏi menu #${menuId} (url: ${item.url})`,
      before: JSON.stringify({ id: item.id, menuId, label: item.label, url: item.url, type: item.type }),
    });
  }

  private buildTree(items: MenuItem[]): MenuItemNode[] {
    const map = new Map<number, MenuItemNode>();
    items.forEach((i) => map.set(i.id, { ...i, children: [] }));
    const roots: MenuItemNode[] = [];
    map.forEach((node) => {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  }
}
