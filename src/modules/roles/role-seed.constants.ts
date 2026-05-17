/**
 * Canonical role + permission catalog.
 *
 * Single source of truth for the RBAC system. The RoleSeederService reconciles
 * the DB to match this catalog on every app bootstrap. To add/remove a system
 * role or change its permissions, edit this file — DB changes alone will be
 * overwritten on next restart.
 */

export const PERMISSION_CATALOG: ReadonlyArray<{
  maQuyen: string;
  tenQuyen: string;
  module: string;
  hanhDong: string;
}> = [
  // Orders
  { maQuyen: 'orders.read',           tenQuyen: 'Xem đơn hàng',                module: 'orders',       hanhDong: 'read' },
  { maQuyen: 'orders.update',         tenQuyen: 'Cập nhật đơn hàng',           module: 'orders',       hanhDong: 'update' },
  // Returns
  { maQuyen: 'returns.read',          tenQuyen: 'Xem yêu cầu đổi/trả',         module: 'returns',      hanhDong: 'read' },
  { maQuyen: 'returns.update',        tenQuyen: 'Xử lý yêu cầu đổi/trả',       module: 'returns',      hanhDong: 'update' },
  // Inventory
  { maQuyen: 'inventory.read',        tenQuyen: 'Xem tồn kho',                 module: 'inventory',    hanhDong: 'read' },
  { maQuyen: 'inventory.create',      tenQuyen: 'Tạo phiếu nhập/xuất kho',     module: 'inventory',    hanhDong: 'create' },
  { maQuyen: 'inventory.update',      tenQuyen: 'Cập nhật tồn kho',            module: 'inventory',    hanhDong: 'update' },
  // Suppliers
  { maQuyen: 'suppliers.read',        tenQuyen: 'Xem nhà cung cấp',            module: 'suppliers',    hanhDong: 'read' },
  { maQuyen: 'suppliers.create',      tenQuyen: 'Tạo nhà cung cấp',            module: 'suppliers',    hanhDong: 'create' },
  { maQuyen: 'suppliers.update',      tenQuyen: 'Cập nhật nhà cung cấp',       module: 'suppliers',    hanhDong: 'update' },
  { maQuyen: 'suppliers.delete',      tenQuyen: 'Xóa nhà cung cấp',            module: 'suppliers',    hanhDong: 'delete' },
  // Products
  { maQuyen: 'products.read',         tenQuyen: 'Xem sản phẩm',                module: 'products',     hanhDong: 'read' },
  { maQuyen: 'products.create',       tenQuyen: 'Tạo sản phẩm',                module: 'products',     hanhDong: 'create' },
  { maQuyen: 'products.update',       tenQuyen: 'Cập nhật sản phẩm',           module: 'products',     hanhDong: 'update' },
  { maQuyen: 'products.delete',       tenQuyen: 'Xóa sản phẩm',                module: 'products',     hanhDong: 'delete' },
  // Categories
  { maQuyen: 'categories.read',       tenQuyen: 'Xem danh mục',                module: 'categories',   hanhDong: 'read' },
  { maQuyen: 'categories.create',     tenQuyen: 'Tạo danh mục',                module: 'categories',   hanhDong: 'create' },
  { maQuyen: 'categories.update',     tenQuyen: 'Cập nhật danh mục',           module: 'categories',   hanhDong: 'update' },
  { maQuyen: 'categories.delete',     tenQuyen: 'Xóa danh mục',                module: 'categories',   hanhDong: 'delete' },
  // Brands
  { maQuyen: 'brands.read',           tenQuyen: 'Xem thương hiệu',             module: 'brands',       hanhDong: 'read' },
  { maQuyen: 'brands.create',         tenQuyen: 'Tạo thương hiệu',             module: 'brands',       hanhDong: 'create' },
  { maQuyen: 'brands.update',         tenQuyen: 'Cập nhật thương hiệu',        module: 'brands',       hanhDong: 'update' },
  { maQuyen: 'brands.delete',         tenQuyen: 'Xóa thương hiệu',             module: 'brands',       hanhDong: 'delete' },
  // Specifications
  { maQuyen: 'specifications.read',   tenQuyen: 'Xem thông số kỹ thuật',       module: 'specifications', hanhDong: 'read' },
  { maQuyen: 'specifications.create', tenQuyen: 'Tạo thông số kỹ thuật',       module: 'specifications', hanhDong: 'create' },
  { maQuyen: 'specifications.update', tenQuyen: 'Cập nhật thông số kỹ thuật',  module: 'specifications', hanhDong: 'update' },
  { maQuyen: 'specifications.delete', tenQuyen: 'Xóa thông số kỹ thuật',       module: 'specifications', hanhDong: 'delete' },
  // Media
  { maQuyen: 'media.read',            tenQuyen: 'Xem thư viện media',          module: 'media',        hanhDong: 'read' },
  { maQuyen: 'media.create',          tenQuyen: 'Upload media',                module: 'media',        hanhDong: 'create' },
  { maQuyen: 'media.update',          tenQuyen: 'Cập nhật media',              module: 'media',        hanhDong: 'update' },
  { maQuyen: 'media.delete',          tenQuyen: 'Xóa media',                   module: 'media',        hanhDong: 'delete' },
  // Build PC
  { maQuyen: 'build-pc.read',         tenQuyen: 'Xem cấu hình PC',             module: 'build-pc',     hanhDong: 'read' },
  { maQuyen: 'build-pc.create',       tenQuyen: 'Tạo cấu hình PC',             module: 'build-pc',     hanhDong: 'create' },
  { maQuyen: 'build-pc.update',       tenQuyen: 'Cập nhật cấu hình PC',        module: 'build-pc',     hanhDong: 'update' },
  { maQuyen: 'build-pc.delete',       tenQuyen: 'Xóa cấu hình PC',             module: 'build-pc',     hanhDong: 'delete' },
  // Payments
  { maQuyen: 'payments.read',         tenQuyen: 'Xem giao dịch thanh toán',    module: 'payments',     hanhDong: 'read' },
  // Reports
  { maQuyen: 'reports.read',          tenQuyen: 'Xem báo cáo',                 module: 'reports',      hanhDong: 'read' },
  // Promotions
  { maQuyen: 'promotions.read',       tenQuyen: 'Xem khuyến mãi',              module: 'promotions',   hanhDong: 'read' },
  { maQuyen: 'promotions.create',     tenQuyen: 'Tạo khuyến mãi',              module: 'promotions',   hanhDong: 'create' },
  { maQuyen: 'promotions.update',     tenQuyen: 'Cập nhật khuyến mãi',         module: 'promotions',   hanhDong: 'update' },
  { maQuyen: 'promotions.delete',     tenQuyen: 'Xóa khuyến mãi',              module: 'promotions',   hanhDong: 'delete' },
  // Flash sales
  { maQuyen: 'flash-sales.read',      tenQuyen: 'Xem flash sale',              module: 'flash-sales',  hanhDong: 'read' },
  { maQuyen: 'flash-sales.create',    tenQuyen: 'Tạo flash sale',              module: 'flash-sales',  hanhDong: 'create' },
  { maQuyen: 'flash-sales.update',    tenQuyen: 'Cập nhật flash sale',         module: 'flash-sales',  hanhDong: 'update' },
  // Loyalty
  { maQuyen: 'loyalty.read',          tenQuyen: 'Xem điểm tích lũy',           module: 'loyalty',      hanhDong: 'read' },
  { maQuyen: 'loyalty.create',        tenQuyen: 'Tạo giao dịch điểm',          module: 'loyalty',      hanhDong: 'create' },
  { maQuyen: 'loyalty.update',        tenQuyen: 'Cập nhật điểm tích lũy',      module: 'loyalty',      hanhDong: 'update' },
  { maQuyen: 'loyalty.delete',        tenQuyen: 'Xóa giao dịch điểm',          module: 'loyalty',      hanhDong: 'delete' },
  // Reviews
  { maQuyen: 'reviews.read',          tenQuyen: 'Xem đánh giá',                module: 'reviews',      hanhDong: 'read' },
  { maQuyen: 'reviews.update',        tenQuyen: 'Kiểm duyệt đánh giá',         module: 'reviews',      hanhDong: 'update' },
  // Support
  { maQuyen: 'support.read',          tenQuyen: 'Xem ticket hỗ trợ',           module: 'support',      hanhDong: 'read' },
  { maQuyen: 'support.create',        tenQuyen: 'Tạo ticket hỗ trợ',           module: 'support',      hanhDong: 'create' },
  { maQuyen: 'support.update',        tenQuyen: 'Cập nhật ticket hỗ trợ',      module: 'support',      hanhDong: 'update' },
  // CMS
  { maQuyen: 'cms.read',              tenQuyen: 'Xem nội dung CMS',            module: 'cms',          hanhDong: 'read' },
  { maQuyen: 'cms.create',            tenQuyen: 'Tạo nội dung CMS',            module: 'cms',          hanhDong: 'create' },
  { maQuyen: 'cms.update',            tenQuyen: 'Cập nhật nội dung CMS',       module: 'cms',          hanhDong: 'update' },
  { maQuyen: 'cms.delete',            tenQuyen: 'Xóa nội dung CMS',            module: 'cms',          hanhDong: 'delete' },
  // Notifications
  { maQuyen: 'notifications.read',    tenQuyen: 'Xem cấu hình thông báo',      module: 'notifications', hanhDong: 'read' },
  { maQuyen: 'notifications.create',  tenQuyen: 'Tạo cấu hình thông báo',      module: 'notifications', hanhDong: 'create' },
  { maQuyen: 'notifications.update',  tenQuyen: 'Cập nhật cấu hình thông báo', module: 'notifications', hanhDong: 'update' },
  { maQuyen: 'notifications.delete',  tenQuyen: 'Xóa cấu hình thông báo',      module: 'notifications', hanhDong: 'delete' },
  // Settings
  { maQuyen: 'settings.read',         tenQuyen: 'Xem cấu hình hệ thống',       module: 'settings',     hanhDong: 'read' },
  { maQuyen: 'settings.update',       tenQuyen: 'Cập nhật cấu hình hệ thống',  module: 'settings',     hanhDong: 'update' },
  // Employees
  { maQuyen: 'employees.read',        tenQuyen: 'Xem nhân viên',               module: 'employees',    hanhDong: 'read' },
  { maQuyen: 'employees.create',      tenQuyen: 'Tạo nhân viên',               module: 'employees',    hanhDong: 'create' },
  { maQuyen: 'employees.update',      tenQuyen: 'Cập nhật nhân viên',          module: 'employees',    hanhDong: 'update' },
  { maQuyen: 'employees.delete',      tenQuyen: 'Xóa nhân viên',               module: 'employees',    hanhDong: 'delete' },
  // Users (customers)
  { maQuyen: 'users.read',            tenQuyen: 'Xem khách hàng',              module: 'users',        hanhDong: 'read' },
  { maQuyen: 'users.create',          tenQuyen: 'Tạo khách hàng',              module: 'users',        hanhDong: 'create' },
  { maQuyen: 'users.update',          tenQuyen: 'Cập nhật khách hàng',         module: 'users',        hanhDong: 'update' },
  { maQuyen: 'users.delete',          tenQuyen: 'Xóa khách hàng',              module: 'users',        hanhDong: 'delete' },
  // Customers (alias used by some controllers — kept for forward compat)
  { maQuyen: 'customers.read',        tenQuyen: 'Xem khách hàng',              module: 'customers',    hanhDong: 'read' },
  // Roles
  { maQuyen: 'roles.read',            tenQuyen: 'Xem vai trò',                 module: 'roles',        hanhDong: 'read' },
  { maQuyen: 'roles.create',          tenQuyen: 'Tạo vai trò',                 module: 'roles',        hanhDong: 'create' },
  { maQuyen: 'roles.update',          tenQuyen: 'Cập nhật vai trò',            module: 'roles',        hanhDong: 'update' },
  { maQuyen: 'roles.delete',          tenQuyen: 'Xóa vai trò',                 module: 'roles',        hanhDong: 'delete' },
  // Audit logs
  { maQuyen: 'audit-logs.read',       tenQuyen: 'Xem nhật ký kiểm toán',       module: 'audit-logs',   hanhDong: 'read' },
  { maQuyen: 'audit-logs.export',     tenQuyen: 'Xuất nhật ký kiểm toán',      module: 'audit-logs',   hanhDong: 'export' },
];

const ALL_PERMISSION_CODES = PERMISSION_CATALOG.map((p) => p.maQuyen);

export interface SystemRoleDef {
  tenVaiTro: string;
  moTa: string;
  permissions: readonly string[] | 'all';
}

export const SYSTEM_ROLES: ReadonlyArray<SystemRoleDef> = [
  {
    tenVaiTro: 'admin',
    moTa: 'Quản trị viên cấp cao — toàn quyền hệ thống',
    permissions: 'all',
  },
  {
    tenVaiTro: 'staff',
    moTa: 'Nhân viên kinh doanh — xử lý đơn hàng, sản phẩm, đánh giá',
    permissions: [
      'orders.read', 'orders.update',
      'products.read', 'products.create', 'products.update',
      'categories.read', 'brands.read', 'specifications.read',
      'customers.read', 'users.read',
      'returns.read', 'returns.update',
      'reviews.read', 'reviews.update',
      'promotions.read',
      'reports.read',
      'media.read', 'media.create',
    ],
  },
  {
    tenVaiTro: 'warehouse',
    moTa: 'Nhân viên kho — quản lý tồn kho, nhập xuất, nhà cung cấp',
    permissions: [
      'inventory.read', 'inventory.create', 'inventory.update',
      'suppliers.read', 'suppliers.create', 'suppliers.update',
      'products.read',
      'orders.read',
    ],
  },
  {
    tenVaiTro: 'accountant',
    moTa: 'Kế toán — xem thanh toán, đơn hàng, báo cáo và nhật ký',
    permissions: [
      'payments.read',
      'orders.read',
      'reports.read',
      'audit-logs.read',
    ],
  },
  {
    tenVaiTro: 'support',
    moTa: 'Chăm sóc khách hàng — xử lý ticket, đổi trả, đánh giá',
    permissions: [
      'support.read', 'support.create', 'support.update',
      'returns.read', 'returns.update',
      'reviews.read', 'reviews.update',
      'customers.read', 'users.read',
      'orders.read',
    ],
  },
  {
    tenVaiTro: 'customer',
    moTa: 'Khách hàng — không có quyền truy cập admin',
    permissions: [],
  },
];

export function resolveRolePermissions(role: SystemRoleDef): string[] {
  return role.permissions === 'all' ? [...ALL_PERMISSION_CODES] : [...role.permissions];
}
