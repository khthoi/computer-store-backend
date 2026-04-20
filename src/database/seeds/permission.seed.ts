import { DataSource } from 'typeorm';
import { Permission } from '../../modules/roles/entities/permission.entity';

const MODULES = [
  'auth', 'users', 'employees', 'roles',
  'categories', 'brands', 'products', 'specifications', 'build-pc', 'media',
  'cart', 'orders', 'payments',
  'inventory', 'suppliers',
  'promotions', 'flash-sales', 'loyalty',
  'reviews', 'returns', 'support',
  'notifications', 'wishlist', 'search',
  'cms', 'reports', 'settings',
];

const ACTIONS = ['read', 'create', 'update', 'delete'] as const;

const MODULE_LABELS: Record<string, string> = {
  auth: 'Xác thực', users: 'Khách hàng', employees: 'Nhân viên', roles: 'Phân quyền',
  categories: 'Danh mục', brands: 'Thương hiệu', products: 'Sản phẩm',
  specifications: 'Thông số kỹ thuật', 'build-pc': 'Build PC', media: 'Media',
  cart: 'Giỏ hàng', orders: 'Đơn hàng', payments: 'Thanh toán',
  inventory: 'Kho hàng', suppliers: 'Nhà cung cấp',
  promotions: 'Khuyến mãi', 'flash-sales': 'Flash Sale', loyalty: 'Loyalty',
  reviews: 'Đánh giá', returns: 'Đổi trả', support: 'Hỗ trợ',
  notifications: 'Thông báo', wishlist: 'Yêu thích', search: 'Tìm kiếm',
  cms: 'Quản lý nội dung', reports: 'Báo cáo', settings: 'Cấu hình',
};

const ACTION_LABELS: Record<string, string> = {
  read: 'Xem', create: 'Tạo', update: 'Sửa', delete: 'Xoá',
};

export async function seedPermissions(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(Permission);

  const permissions: Partial<Permission>[] = [];
  for (const module of MODULES) {
    for (const action of ACTIONS) {
      const maQuyen = `${module}.${action}`;
      const existing = await repo.findOne({ where: { maQuyen } });
      if (!existing) {
        permissions.push({
          maQuyen,
          tenQuyen: `${ACTION_LABELS[action]} ${MODULE_LABELS[module] ?? module}`,
          module,
          hanhDong: action,
        });
      }
    }
  }

  if (permissions.length > 0) {
    await repo.save(repo.create(permissions));
    console.log(`✅ Seeded ${permissions.length} permissions`);
  } else {
    console.log('ℹ️  Permissions đã tồn tại, bỏ qua');
  }
}
