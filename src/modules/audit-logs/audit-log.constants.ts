export const AuditAction = {
  // CRUD
  CREATE:          'TaoMoi',
  UPDATE:          'CapNhat',
  STATUS_CHANGE:   'DoiTrangThai',
  DELETE:          'Xoa',
  SOFT_DELETE:     'VoHieuHoa',

  // Auth
  LOGIN:           'DangNhap',
  LOGIN_FAILED:    'DangNhapThatBai',
  LOGOUT:          'DangXuat',

  // Employee-specific
  ASSIGN_ROLES:             'PhanCongVaiTro',
  REQUEST_PASSWORD_CHANGE:  'YeuCauDoiMatKhau',

  // Order flow
  PLACE_ORDER:     'TaoDonHang',
  CANCEL_ORDER:    'HuyDonHang',
  CONFIRM_ORDER:   'XacNhanDonHang',
  SHIP_ORDER:      'GiaoHang',
  COMPLETE_ORDER:  'HoanThanh',
  REFUND:          'HoanTien',

  // Inventory
  STOCK_IN:        'NhapKho',
  STOCK_OUT:       'XuatKho',
  STOCK_ADJUST:    'DieuChinhTonKho',

  // Payment
  PAYMENT_SUCCESS: 'ThanhToanThanhCong',
  PAYMENT_FAILED:  'ThanhToanThatBai',
  PAYMENT_REFUND:  'HoanTienThanhToan',

  // Promotion / Flash Sale
  ACTIVATE:        'KichHoat',
  DEACTIVATE:      'TamDung',
  CANCEL:          'HuyBo',
  APPLY_COUPON:    'ApDungMaGiam',

  // Support
  OPEN_TICKET:     'MoTicket',
  CLOSE_TICKET:    'DongTicket',
  REPLY_TICKET:    'PhanHoiTicket',
  ESCALATE:        'ChuyenCap',

  // Content / CMS
  PUBLISH:         'XuatBan',
  UNPUBLISH:       'HuyXuatBan',
  REORDER:         'SapXepLai',
} as const;

export type AuditActionType = typeof AuditAction[keyof typeof AuditAction];

export const EntityType = {
  EMPLOYEE:        'NhanVien',
  CUSTOMER:        'KhachHang',
  ROLE:            'VaiTro',
  PRODUCT:         'SanPham',
  VARIANT:         'PhienBan',
  CATEGORY:        'DanhMuc',
  BRAND:           'ThuongHieu',
  SPEC:            'ThongSoKyThuat',
  ORDER:           'DonHang',
  ORDER_ITEM:      'ChiTietDonHang',
  INVENTORY:       'TonKho',
  STOCK_RECEIPT:   'PhieuNhapKho',
  SUPPLIER:        'NhaCungCap',
  PROMOTION:       'KhuyenMai',
  COUPON:          'MaGiamGia',
  FLASH_SALE:      'FlashSale',
  REVIEW:          'DanhGia',
  RETURN:          'HoanHang',
  PAYMENT:         'ThanhToan',
  SUPPORT_TICKET:  'TicketHoTro',
  BUILD_PC:        'BuildPC',
  CMS_BANNER:      'Banner',
  CMS_PAGE:        'TrangNoiDung',
  CMS_FAQ:         'FAQ',
  CMS_MENU:        'Menu',
  LOYALTY:         'DiemThuong',
  NOTIFICATION:    'ThongBao',
  SETTING:         'CauHinhHeThong',
} as const;
