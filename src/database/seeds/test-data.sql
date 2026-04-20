-- ============================================================
-- TEST DATA SEED — pc-retails-store-database
-- Mật khẩu test: Admin@123, Staff@123, Customer@123
-- ============================================================

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET CHARACTER SET utf8mb4;

USE `pc-retails-store-database`;

-- ============================================================
-- 1. QUYỀN (permissions)
-- ============================================================
INSERT INTO `quyen` (`ma_quyen`, `ten_quyen`, `module`, `hanh_dong`) VALUES
-- auth
('auth.read',             'Xem Xác thực',            'auth',           'read'),
('auth.create',           'Tạo Xác thực',            'auth',           'create'),
('auth.update',           'Sửa Xác thực',            'auth',           'update'),
('auth.delete',           'Xoá Xác thực',            'auth',           'delete'),
-- users
('users.read',            'Xem Khách hàng',          'users',          'read'),
('users.create',          'Tạo Khách hàng',          'users',          'create'),
('users.update',          'Sửa Khách hàng',          'users',          'update'),
('users.delete',          'Xoá Khách hàng',          'users',          'delete'),
-- employees
('employees.read',        'Xem Nhân viên',           'employees',      'read'),
('employees.create',      'Tạo Nhân viên',           'employees',      'create'),
('employees.update',      'Sửa Nhân viên',           'employees',      'update'),
('employees.delete',      'Xoá Nhân viên',           'employees',      'delete'),
-- roles
('roles.read',            'Xem Phân quyền',          'roles',          'read'),
('roles.create',          'Tạo Phân quyền',          'roles',          'create'),
('roles.update',          'Sửa Phân quyền',          'roles',          'update'),
('roles.delete',          'Xoá Phân quyền',          'roles',          'delete'),
-- categories
('categories.read',       'Xem Danh mục',            'categories',     'read'),
('categories.create',     'Tạo Danh mục',            'categories',     'create'),
('categories.update',     'Sửa Danh mục',            'categories',     'update'),
('categories.delete',     'Xoá Danh mục',            'categories',     'delete'),
-- brands
('brands.read',           'Xem Thương hiệu',         'brands',         'read'),
('brands.create',         'Tạo Thương hiệu',         'brands',         'create'),
('brands.update',         'Sửa Thương hiệu',         'brands',         'update'),
('brands.delete',         'Xoá Thương hiệu',         'brands',         'delete'),
-- products
('products.read',         'Xem Sản phẩm',            'products',       'read'),
('products.create',       'Tạo Sản phẩm',            'products',       'create'),
('products.update',       'Sửa Sản phẩm',            'products',       'update'),
('products.delete',       'Xoá Sản phẩm',            'products',       'delete'),
-- specifications
('specifications.read',   'Xem Thông số kỹ thuật',   'specifications', 'read'),
('specifications.create', 'Tạo Thông số kỹ thuật',   'specifications', 'create'),
('specifications.update', 'Sửa Thông số kỹ thuật',   'specifications', 'update'),
('specifications.delete', 'Xoá Thông số kỹ thuật',   'specifications', 'delete'),
-- build-pc
('build-pc.read',         'Xem Build PC',            'build-pc',       'read'),
('build-pc.create',       'Tạo Build PC',            'build-pc',       'create'),
('build-pc.update',       'Sửa Build PC',            'build-pc',       'update'),
('build-pc.delete',       'Xoá Build PC',            'build-pc',       'delete'),
-- media
('media.read',            'Xem Media',               'media',          'read'),
('media.create',          'Tạo Media',               'media',          'create'),
('media.update',          'Sửa Media',               'media',          'update'),
('media.delete',          'Xoá Media',               'media',          'delete'),
-- cart
('cart.read',             'Xem Giỏ hàng',            'cart',           'read'),
('cart.create',           'Tạo Giỏ hàng',            'cart',           'create'),
('cart.update',           'Sửa Giỏ hàng',            'cart',           'update'),
('cart.delete',           'Xoá Giỏ hàng',            'cart',           'delete'),
-- orders
('orders.read',           'Xem Đơn hàng',            'orders',         'read'),
('orders.create',         'Tạo Đơn hàng',            'orders',         'create'),
('orders.update',         'Sửa Đơn hàng',            'orders',         'update'),
('orders.delete',         'Xoá Đơn hàng',            'orders',         'delete'),
-- payments
('payments.read',         'Xem Thanh toán',          'payments',       'read'),
('payments.create',       'Tạo Thanh toán',          'payments',       'create'),
('payments.update',       'Sửa Thanh toán',          'payments',       'update'),
('payments.delete',       'Xoá Thanh toán',          'payments',       'delete'),
-- inventory
('inventory.read',        'Xem Kho hàng',            'inventory',      'read'),
('inventory.create',      'Tạo Kho hàng',            'inventory',      'create'),
('inventory.update',      'Sửa Kho hàng',            'inventory',      'update'),
('inventory.delete',      'Xoá Kho hàng',            'inventory',      'delete'),
-- suppliers
('suppliers.read',        'Xem Nhà cung cấp',        'suppliers',      'read'),
('suppliers.create',      'Tạo Nhà cung cấp',        'suppliers',      'create'),
('suppliers.update',      'Sửa Nhà cung cấp',        'suppliers',      'update'),
('suppliers.delete',      'Xoá Nhà cung cấp',        'suppliers',      'delete'),
-- promotions
('promotions.read',       'Xem Khuyến mãi',          'promotions',     'read'),
('promotions.create',     'Tạo Khuyến mãi',          'promotions',     'create'),
('promotions.update',     'Sửa Khuyến mãi',          'promotions',     'update'),
('promotions.delete',     'Xoá Khuyến mãi',          'promotions',     'delete'),
-- flash-sales
('flash-sales.read',      'Xem Flash Sale',          'flash-sales',    'read'),
('flash-sales.create',    'Tạo Flash Sale',          'flash-sales',    'create'),
('flash-sales.update',    'Sửa Flash Sale',          'flash-sales',    'update'),
('flash-sales.delete',    'Xoá Flash Sale',          'flash-sales',    'delete'),
-- loyalty
('loyalty.read',          'Xem Loyalty',             'loyalty',        'read'),
('loyalty.create',        'Tạo Loyalty',             'loyalty',        'create'),
('loyalty.update',        'Sửa Loyalty',             'loyalty',        'update'),
('loyalty.delete',        'Xoá Loyalty',             'loyalty',        'delete'),
-- reviews
('reviews.read',          'Xem Đánh giá',            'reviews',        'read'),
('reviews.create',        'Tạo Đánh giá',            'reviews',        'create'),
('reviews.update',        'Sửa Đánh giá',            'reviews',        'update'),
('reviews.delete',        'Xoá Đánh giá',            'reviews',        'delete'),
-- returns
('returns.read',          'Xem Đổi trả',             'returns',        'read'),
('returns.create',        'Tạo Đổi trả',             'returns',        'create'),
('returns.update',        'Sửa Đổi trả',             'returns',        'update'),
('returns.delete',        'Xoá Đổi trả',             'returns',        'delete'),
-- support
('support.read',          'Xem Hỗ trợ',              'support',        'read'),
('support.create',        'Tạo Hỗ trợ',              'support',        'create'),
('support.update',        'Sửa Hỗ trợ',              'support',        'update'),
('support.delete',        'Xoá Hỗ trợ',              'support',        'delete'),
-- notifications
('notifications.read',    'Xem Thông báo',           'notifications',  'read'),
('notifications.create',  'Tạo Thông báo',           'notifications',  'create'),
('notifications.update',  'Sửa Thông báo',           'notifications',  'update'),
('notifications.delete',  'Xoá Thông báo',           'notifications',  'delete'),
-- wishlist
('wishlist.read',         'Xem Yêu thích',           'wishlist',       'read'),
('wishlist.create',       'Tạo Yêu thích',           'wishlist',       'create'),
('wishlist.update',       'Sửa Yêu thích',           'wishlist',       'update'),
('wishlist.delete',       'Xoá Yêu thích',           'wishlist',       'delete'),
-- search
('search.read',           'Xem Tìm kiếm',            'search',         'read'),
('search.create',         'Tạo Tìm kiếm',            'search',         'create'),
('search.update',         'Sửa Tìm kiếm',            'search',         'update'),
('search.delete',         'Xoá Tìm kiếm',            'search',         'delete'),
-- cms
('cms.read',              'Xem Quản lý nội dung',    'cms',            'read'),
('cms.create',            'Tạo Quản lý nội dung',    'cms',            'create'),
('cms.update',            'Sửa Quản lý nội dung',    'cms',            'update'),
('cms.delete',            'Xoá Quản lý nội dung',    'cms',            'delete'),
-- reports
('reports.read',          'Xem Báo cáo',             'reports',        'read'),
('reports.create',        'Tạo Báo cáo',             'reports',        'create'),
('reports.update',        'Sửa Báo cáo',             'reports',        'update'),
('reports.delete',        'Xoá Báo cáo',             'reports',        'delete'),
-- settings
('settings.read',         'Xem Cấu hình',            'settings',       'read'),
('settings.create',       'Tạo Cấu hình',            'settings',       'create'),
('settings.update',       'Sửa Cấu hình',            'settings',       'update'),
('settings.delete',       'Xoá Cấu hình',            'settings',       'delete');

-- ============================================================
-- 2. VAI TRÒ (roles)
-- ============================================================
INSERT INTO `vai_tro` (`ten_vai_tro`, `mo_ta`) VALUES
('admin',      'Quản trị viên - toàn quyền hệ thống'),
('staff',      'Nhân viên bán hàng'),
('warehouse',  'Nhân viên kho hàng'),
('accountant', 'Kế toán'),
('support',    'Nhân viên chăm sóc khách hàng');

-- ============================================================
-- 3. VAI TRÒ - QUYỀN
-- ============================================================
-- admin => toàn bộ quyền
INSERT INTO `vai_tro_quyen` (`vai_tro_id`, `quyen_id`)
SELECT v.vai_tro_id, q.quyen_id
FROM `vai_tro` v, `quyen` q
WHERE v.ten_vai_tro = 'admin';

-- staff
INSERT INTO `vai_tro_quyen` (`vai_tro_id`, `quyen_id`)
SELECT v.vai_tro_id, q.quyen_id
FROM `vai_tro` v JOIN `quyen` q ON q.ma_quyen IN (
  'products.read','categories.read','brands.read',
  'orders.read','orders.update',
  'users.read',
  'inventory.read',
  'promotions.read',
  'reviews.read','reviews.update',
  'support.read','support.create','support.update',
  'notifications.read'
)
WHERE v.ten_vai_tro = 'staff';

-- warehouse
INSERT INTO `vai_tro_quyen` (`vai_tro_id`, `quyen_id`)
SELECT v.vai_tro_id, q.quyen_id
FROM `vai_tro` v JOIN `quyen` q ON q.ma_quyen IN (
  'inventory.read','inventory.create','inventory.update',
  'suppliers.read',
  'products.read',
  'orders.read'
)
WHERE v.ten_vai_tro = 'warehouse';

-- accountant
INSERT INTO `vai_tro_quyen` (`vai_tro_id`, `quyen_id`)
SELECT v.vai_tro_id, q.quyen_id
FROM `vai_tro` v JOIN `quyen` q ON q.ma_quyen IN (
  'orders.read',
  'payments.read',
  'reports.read',
  'promotions.read',
  'loyalty.read'
)
WHERE v.ten_vai_tro = 'accountant';

-- support
INSERT INTO `vai_tro_quyen` (`vai_tro_id`, `quyen_id`)
SELECT v.vai_tro_id, q.quyen_id
FROM `vai_tro` v JOIN `quyen` q ON q.ma_quyen IN (
  'support.read','support.create','support.update',
  'returns.read','returns.update',
  'reviews.read',
  'users.read',
  'orders.read',
  'notifications.read'
)
WHERE v.ten_vai_tro = 'support';

-- ============================================================
-- 4. NHÂN VIÊN (employees)
-- Admin@123  => $2b$10$Rpvyzesmp2fN1jWfX5.C8uSM1tJYmKaIEFbf47NgfHWjB0FeTfSZO
-- Staff@123  => $2b$10$ljZLPH9sdDiaYZWv1nT43eSSDEtlQcZ3tC.moBvubq7YhtX77BURO
-- ============================================================
INSERT INTO `nhan_vien` (`ma_nhan_vien`, `email`, `ho_ten`, `gioi_tinh`, `mat_khau_hash`, `trang_thai`) VALUES
('NV001', 'admin@pcstore.vn',     'Nguyễn Văn Admin', 'Male',   '$2b$10$Rpvyzesmp2fN1jWfX5.C8uSM1tJYmKaIEFbf47NgfHWjB0FeTfSZO', 'DangLam'),
('NV002', 'staff01@pcstore.vn',   'Trần Thị Lan',     'Female', '$2b$10$ljZLPH9sdDiaYZWv1nT43eSSDEtlQcZ3tC.moBvubq7YhtX77BURO', 'DangLam'),
('NV003', 'staff02@pcstore.vn',   'Lê Minh Tuấn',     'Male',   '$2b$10$ljZLPH9sdDiaYZWv1nT43eSSDEtlQcZ3tC.moBvubq7YhtX77BURO', 'DangLam'),
('NV004', 'warehouse@pcstore.vn', 'Phạm Văn Kho',     'Male',   '$2b$10$ljZLPH9sdDiaYZWv1nT43eSSDEtlQcZ3tC.moBvubq7YhtX77BURO', 'DangLam'),
('NV005', 'ketoan@pcstore.vn',    'Hoàng Thị Mai',    'Female', '$2b$10$ljZLPH9sdDiaYZWv1nT43eSSDEtlQcZ3tC.moBvubq7YhtX77BURO', 'DangLam'),
('NV006', 'cskh01@pcstore.vn',    'Đỗ Thành Long',    'Male',   '$2b$10$ljZLPH9sdDiaYZWv1nT43eSSDEtlQcZ3tC.moBvubq7YhtX77BURO', 'DangLam'),
('NV007', 'cskh02@pcstore.vn',    'Vũ Thị Hoa',       'Female', '$2b$10$ljZLPH9sdDiaYZWv1nT43eSSDEtlQcZ3tC.moBvubq7YhtX77BURO', 'NghiViec');

-- ============================================================
-- 5. NHÂN VIÊN - VAI TRÒ
-- ============================================================
INSERT INTO `nhan_vien_vai_tro` (`nhan_vien_id`, `vai_tro_id`)
SELECT nv.nhan_vien_id, vt.vai_tro_id FROM `nhan_vien` nv, `vai_tro` vt
WHERE nv.ma_nhan_vien = 'NV001' AND vt.ten_vai_tro = 'admin';

INSERT INTO `nhan_vien_vai_tro` (`nhan_vien_id`, `vai_tro_id`)
SELECT nv.nhan_vien_id, vt.vai_tro_id FROM `nhan_vien` nv, `vai_tro` vt
WHERE nv.ma_nhan_vien = 'NV002' AND vt.ten_vai_tro = 'staff';

INSERT INTO `nhan_vien_vai_tro` (`nhan_vien_id`, `vai_tro_id`)
SELECT nv.nhan_vien_id, vt.vai_tro_id FROM `nhan_vien` nv, `vai_tro` vt
WHERE nv.ma_nhan_vien = 'NV003' AND vt.ten_vai_tro = 'staff';

INSERT INTO `nhan_vien_vai_tro` (`nhan_vien_id`, `vai_tro_id`)
SELECT nv.nhan_vien_id, vt.vai_tro_id FROM `nhan_vien` nv, `vai_tro` vt
WHERE nv.ma_nhan_vien = 'NV004' AND vt.ten_vai_tro = 'warehouse';

INSERT INTO `nhan_vien_vai_tro` (`nhan_vien_id`, `vai_tro_id`)
SELECT nv.nhan_vien_id, vt.vai_tro_id FROM `nhan_vien` nv, `vai_tro` vt
WHERE nv.ma_nhan_vien = 'NV005' AND vt.ten_vai_tro = 'accountant';

INSERT INTO `nhan_vien_vai_tro` (`nhan_vien_id`, `vai_tro_id`)
SELECT nv.nhan_vien_id, vt.vai_tro_id FROM `nhan_vien` nv, `vai_tro` vt
WHERE nv.ma_nhan_vien = 'NV006' AND vt.ten_vai_tro = 'support';

INSERT INTO `nhan_vien_vai_tro` (`nhan_vien_id`, `vai_tro_id`)
SELECT nv.nhan_vien_id, vt.vai_tro_id FROM `nhan_vien` nv, `vai_tro` vt
WHERE nv.ma_nhan_vien = 'NV007' AND vt.ten_vai_tro = 'support';

-- ============================================================
-- 6. KHÁCH HÀNG (customers)
-- Customer@123 => $2b$10$1yJozYVrekRJiQyya1Pr1.eLydyfQEguuvQIYtGCUTJiqhW4eplxW
-- ============================================================
INSERT INTO `khach_hang` (`email`, `so_dien_thoai`, `ho_ten`, `mat_khau_hash`, `ngay_sinh`, `gioiTinh`, `trang_thai`, `xac_minh_email`, `diem_hien_tai`) VALUES
('nguyenvana@gmail.com', '0901234561', 'Nguyễn Văn A',  '$2b$10$1yJozYVrekRJiQyya1Pr1.eLydyfQEguuvQIYtGCUTJiqhW4eplxW', '1990-05-15', 'Nam', 'HoatDong', 1, 1200),
('tranthib@gmail.com',   '0901234562', 'Trần Thị B',    '$2b$10$1yJozYVrekRJiQyya1Pr1.eLydyfQEguuvQIYtGCUTJiqhW4eplxW', '1995-08-20', 'Nữ',  'HoatDong', 1,  850),
('leminhc@gmail.com',    '0901234563', 'Lê Minh C',     '$2b$10$1yJozYVrekRJiQyya1Pr1.eLydyfQEguuvQIYtGCUTJiqhW4eplxW', '1988-03-10', 'Nam', 'HoatDong', 1, 2500),
('phamthid@gmail.com',   '0901234564', 'Phạm Thị D',    '$2b$10$1yJozYVrekRJiQyya1Pr1.eLydyfQEguuvQIYtGCUTJiqhW4eplxW', '1993-11-25', 'Nữ',  'HoatDong', 1,    0),
('hoangvane@gmail.com',  '0901234565', 'Hoàng Văn E',   '$2b$10$1yJozYVrekRJiQyya1Pr1.eLydyfQEguuvQIYtGCUTJiqhW4eplxW', '1992-07-30', 'Nam', 'HoatDong', 0,  320),
('dothif@gmail.com',     '0901234566', 'Đỗ Thị F',      '$2b$10$1yJozYVrekRJiQyya1Pr1.eLydyfQEguuvQIYtGCUTJiqhW4eplxW', '1998-01-05', 'Nữ',  'HoatDong', 1,  150),
('vuminh@gmail.com',     '0901234567', 'Vũ Văn Minh',   '$2b$10$1yJozYVrekRJiQyya1Pr1.eLydyfQEguuvQIYtGCUTJiqhW4eplxW', '1985-09-12', 'Nam', 'HoatDong', 1, 4800),
('ngothig@gmail.com',    '0901234568', 'Ngô Thị G',     '$2b$10$1yJozYVrekRJiQyya1Pr1.eLydyfQEguuvQIYtGCUTJiqhW4eplxW', '2000-04-18', 'Nữ',  'HoatDong', 1,    0),
('buivanhung@gmail.com', '0901234569', 'Bùi Văn Hùng',  '$2b$10$1yJozYVrekRJiQyya1Pr1.eLydyfQEguuvQIYtGCUTJiqhW4eplxW', '1991-06-22', 'Nam', 'BiKhoa',   1,  200),
('dangthii@gmail.com',   '0901234570', 'Đặng Thị I',    '$2b$10$1yJozYVrekRJiQyya1Pr1.eLydyfQEguuvQIYtGCUTJiqhW4eplxW', '1996-12-08', 'Nữ',  'HoatDong', 0,    0);

-- ============================================================
-- 7. ĐỊA CHỈ GIAO HÀNG (shipping addresses)
-- ============================================================
INSERT INTO `dia_chi_giao_hang` (`khach_hang_id`, `ho_ten_nguoi_nhan`, `so_dien_thoai_nhan`, `dia_chi_chi_tiet`, `quan_huyen`, `tinh_thanh_pho`, `la_mac_dinh`) VALUES
(1, 'Nguyễn Văn A', '0901234561', '123 Nguyễn Trãi',        'Quận 1',         'TP. Hồ Chí Minh', 1),
(1, 'Nguyễn Văn A', '0901234561', '456 Lê Lợi',             'Quận 3',         'TP. Hồ Chí Minh', 0),
(2, 'Trần Thị B',   '0901234562', '78 Hoàn Kiếm',           'Quận Hoàn Kiếm', 'Hà Nội',          1),
(3, 'Lê Minh C',    '0901234563', '99 Trần Phú',            'Hải Châu',       'Đà Nẵng',         1),
(3, 'Công ty ABC',  '0901234563', 'Lô B5 KCN Hòa Khánh',   'Liên Chiểu',    'Đà Nẵng',         0),
(4, 'Phạm Thị D',   '0901234564', '12 Đinh Tiên Hoàng',    'Bình Thạnh',     'TP. Hồ Chí Minh', 1),
(5, 'Hoàng Văn E',  '0901234565', '34 Nguyễn Huệ',         'Quận 1',         'TP. Hồ Chí Minh', 1),
(6, 'Đỗ Thị F',     '0901234566', '56 Lý Thường Kiệt',     'Quận Tây Hồ',    'Hà Nội',          1),
(7, 'Vũ Văn Minh',  '0901234567', '22 Phạm Văn Đồng',      'Gò Vấp',         'TP. Hồ Chí Minh', 1),
(7, 'Vũ Văn Minh',  '0901234567', '100 Điện Biên Phủ',     'Bình Thạnh',     'TP. Hồ Chí Minh', 0),
(8, 'Ngô Thị G',    '0901234568', '88 Nguyễn Văn Cừ',      'Quận 5',         'TP. Hồ Chí Minh', 1),
(10,'Đặng Thị I',   '0901234570', '11 Bà Triệu',            'Hai Bà Trưng',   'Hà Nội',          1);
