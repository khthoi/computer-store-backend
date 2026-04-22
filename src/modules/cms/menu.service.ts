import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Menu } from './entities/menu.entity';
import { MenuItem } from './entities/menu-item.entity';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

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
    return this.menuRepo.find({ order: { position: 'ASC' } });
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
    return this.itemRepo.save(this.itemRepo.create({ ...dto, menuId }));
  }

  async updateItem(menuId: number, itemId: number, dto: UpdateMenuItemDto) {
    const item = await this.itemRepo.findOne({ where: { id: itemId, menuId } });
    if (!item) throw new NotFoundException('Menu item không tồn tại');
    await this.itemRepo.update(itemId, dto);
    return this.itemRepo.findOne({ where: { id: itemId } });
  }

  async removeItem(menuId: number, itemId: number) {
    const item = await this.itemRepo.findOne({ where: { id: itemId, menuId } });
    if (!item) throw new NotFoundException('Menu item không tồn tại');
    await this.itemRepo.delete(itemId);
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
