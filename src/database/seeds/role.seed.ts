import { DataSource } from 'typeorm';
import { Role } from '../../modules/roles/entities/role.entity';
import { Permission } from '../../modules/roles/entities/permission.entity';

interface RoleDefinition {
  tenVaiTro: string;
  moTa: string;
  permissions: string[]; // maQuyen patterns (prefix match)
}

const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    tenVaiTro: 'admin',
    moTa: 'Quản trị viên - toàn quyền hệ thống',
    permissions: ['*'], // tất cả permissions
  },
  {
    tenVaiTro: 'staff',
    moTa: 'Nhân viên bán hàng',
    permissions: [
      'products.read', 'categories.read', 'brands.read',
      'orders.read', 'orders.update',
      'users.read',
      'inventory.read',
      'promotions.read',
      'reviews.read', 'reviews.update',
      'support.read', 'support.create', 'support.update',
      'notifications.read',
    ],
  },
  {
    tenVaiTro: 'warehouse',
    moTa: 'Nhân viên kho hàng',
    permissions: [
      'inventory.read', 'inventory.create', 'inventory.update',
      'suppliers.read',
      'products.read',
      'orders.read',
    ],
  },
  {
    tenVaiTro: 'accountant',
    moTa: 'Kế toán',
    permissions: [
      'orders.read',
      'payments.read',
      'reports.read',
      'promotions.read',
      'loyalty.read',
    ],
  },
  {
    tenVaiTro: 'support',
    moTa: 'Nhân viên chăm sóc khách hàng',
    permissions: [
      'support.read', 'support.create', 'support.update',
      'returns.read', 'returns.update',
      'reviews.read',
      'users.read',
      'orders.read',
      'notifications.read',
    ],
  },
];

export async function seedRoles(dataSource: DataSource): Promise<void> {
  const roleRepo = dataSource.getRepository(Role);
  const permRepo = dataSource.getRepository(Permission);
  const allPermissions = await permRepo.find();

  for (const def of ROLE_DEFINITIONS) {
    const existing = await roleRepo.findOne({
      where: { tenVaiTro: def.tenVaiTro },
      relations: ['permissions'],
    });

    let permissions: Permission[];
    if (def.permissions.includes('*')) {
      permissions = allPermissions;
    } else {
      permissions = allPermissions.filter((p) => def.permissions.includes(p.maQuyen));
    }

    if (existing) {
      existing.permissions = permissions;
      await roleRepo.save(existing);
      console.log(`🔄 Updated role: ${def.tenVaiTro}`);
    } else {
      const role = roleRepo.create({ tenVaiTro: def.tenVaiTro, moTa: def.moTa, permissions });
      await roleRepo.save(role);
      console.log(`✅ Created role: ${def.tenVaiTro}`);
    }
  }
}
