import type { TestSuite } from '../types';

// ─── Phase 5: Promotions · Flash Sales · Loyalty ─────────────────────────────
// Existing seed data used in tests:
//   promotion_id 1 (SALE10, coupon, active)  |  flash_sale_id 1 (sap_dien_ra)
//   loyalty catalog: id 1 (300 pts freeship), id 2 (500 pts -50k), id 3 (1000 pts -100k)
//   customer nguyenvana@gmail.com has 1200 points
// ──────────────────────────────────────────────────────────────────────────────

export const phase5Suite: TestSuite = {
  name: 'Phase 5 — Promotions, Flash Sales, Loyalty',
  cases: [
    // ── Auth guards ──────────────────────────────────────────────────────────
    {
      name: 'GET /admin/promotions — no token → 401',
      method: 'GET',
      path: '/admin/promotions',
      auth: 'none',
      expect: { status: 401 },
    },
    {
      name: 'GET /admin/promotions — customer token → 403',
      method: 'GET',
      path: '/admin/promotions',
      auth: 'customer',
      expect: { status: 403 },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // PROMOTIONS — Public
    // ═══════════════════════════════════════════════════════════════════════
    {
      name: 'GET /promotions/active — list active promotions (public)',
      method: 'GET',
      path: '/promotions/active',
      auth: 'none',
      expect: { status: 200 },
    },
    {
      name: 'POST /promotions/apply — no token → 401',
      method: 'POST',
      path: '/promotions/apply',
      auth: 'none',
      body: { code: 'SALE10', items: [], subtotal: 5000000 },
      expect: { status: 401 },
    },
    {
      name: 'POST /promotions/apply — invalid coupon code → 400 or 404',
      method: 'POST',
      path: '/promotions/apply',
      auth: 'customer',
      body: {
        code: 'INVALID_CODE_XYZ',
        items: [{ variantId: 1, quantity: 1, price: 4500000 }],
        subtotal: 4500000,
      },
      expect: { status: [400, 404] },
    },
    {
      name: 'POST /promotions/apply — valid coupon SALE10, subtotal 5M → applied',
      method: 'POST',
      path: '/promotions/apply',
      auth: 'customer',
      body: {
        code: 'SALE10',
        items: [{ variantId: 1, quantity: 1, price: 5000000 }],
        subtotal: 5000000,
      },
      expect: { status: 201, contains: 'discountAmount' },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // PROMOTIONS — Admin CRUD
    // ═══════════════════════════════════════════════════════════════════════
    {
      name: 'GET /admin/promotions — list all (admin)',
      method: 'GET',
      path: '/admin/promotions',
      auth: 'admin',
      expect: { status: 200, contains: 'total' },
    },
    {
      name: 'GET /admin/promotions?status=active — filter by status',
      method: 'GET',
      path: '/admin/promotions',
      auth: 'admin',
      query: { status: 'active' },
      expect: { status: 200 },
    },
    {
      name: 'GET /admin/promotions/:id — detail (id=1)',
      method: 'GET',
      path: '/admin/promotions/1',
      auth: 'admin',
      expect: { status: 200, contains: 'scopes' },
    },
    {
      name: 'GET /admin/promotions/:id — not found → 404',
      method: 'GET',
      path: '/admin/promotions/99999',
      auth: 'admin',
      expect: { status: 404 },
    },
    {
      // isCoupon: false → auto-apply, không cần code → không conflict khi chạy lặp lại
      name: 'POST /admin/promotions — create auto-apply promotion',
      method: 'POST',
      path: '/admin/promotions',
      auth: 'admin',
      body: {
        name: '__Test Promotion API Runner__',
        type: 'standard',
        isCoupon: false,
        status: 'draft',
        priority: 1,
        stackingPolicy: 'exclusive',
        startDate: '2026-06-01T00:00:00Z',
        endDate: '2026-06-30T23:59:59Z',
        totalUsageLimit: 10,
        perCustomerLimit: 1,
        scopes: [],
        conditions: [],
        actions: [
          {
            actionType: 'percentage_discount',
            applicationLevel: 'cart_total',
            discountType: 'percentage',
            discountValue: 5,
          },
        ],
      },
      extract: { testPromotionId: 'data.id' },
      expect: { status: 201 },
    },
    {
      name: 'PUT /admin/promotions/:id — update name',
      method: 'PUT',
      path: '/admin/promotions/{{testPromotionId}}',
      auth: 'admin',
      body: { name: '__Test Promotion API Runner Updated__' },
      expect: { status: 200 },
    },
    {
      name: 'DELETE /admin/promotions/:id — cancel (set status=cancelled)',
      method: 'DELETE',
      path: '/admin/promotions/{{testPromotionId}}',
      auth: 'admin',
      expect: { status: 200 },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // FLASH SALES — Public
    // ═══════════════════════════════════════════════════════════════════════
    {
      name: 'GET /flash-sales/active — active flash sale (public)',
      method: 'GET',
      path: '/flash-sales/active',
      auth: 'none',
      expect: { status: 200 },
    },
    {
      name: 'GET /flash-sales/:id — detail (id=1, sap_dien_ra)',
      method: 'GET',
      path: '/flash-sales/1',
      auth: 'none',
      expect: { status: 200, contains: 'items' },
    },
    {
      name: 'GET /flash-sales/:id — not found → 404',
      method: 'GET',
      path: '/flash-sales/99999',
      auth: 'none',
      expect: { status: 404 },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // FLASH SALES — Admin CRUD
    // ═══════════════════════════════════════════════════════════════════════
    {
      name: 'GET /admin/flash-sales — list all (admin)',
      method: 'GET',
      path: '/admin/flash-sales',
      auth: 'admin',
      expect: { status: 200 },
    },
    {
      name: 'GET /admin/flash-sales/:id — detail (id=1)',
      method: 'GET',
      path: '/admin/flash-sales/1',
      auth: 'admin',
      expect: { status: 200 },
    },
    {
      name: 'GET /admin/flash-sales/:id — not found → 404',
      method: 'GET',
      path: '/admin/flash-sales/99999',
      auth: 'admin',
      expect: { status: 404 },
    },
    {
      name: 'POST /admin/flash-sales — create new flash sale',
      method: 'POST',
      path: '/admin/flash-sales',
      auth: 'admin',
      body: {
        ten: '__Test Flash Sale API Runner__',
        moTa: 'Flash sale test từ API Runner',
        batDau: '2027-01-01T10:00:00Z',
        ketThuc: '2027-01-01T14:00:00Z',
        bannerTitle: 'Test Flash Sale',
        items: [
          { phienBanId: 1, giaFlash: 3990000, soLuongGioiHan: 10, thuTuHienThi: 1 },
        ],
      },
      extract: { testFlashSaleId: 'data.id' },
      expect: { status: 201 },
    },
    {
      name: 'PUT /admin/flash-sales/:id — update flash sale',
      method: 'PUT',
      path: '/admin/flash-sales/{{testFlashSaleId}}',
      auth: 'admin',
      body: { ten: '__Test Flash Sale API Runner Updated__' },
      expect: { status: 200 },
    },
    {
      name: 'DELETE /admin/flash-sales/:id — cancel flash sale',
      method: 'DELETE',
      path: '/admin/flash-sales/{{testFlashSaleId}}',
      auth: 'admin',
      expect: { status: 200 },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LOYALTY — Customer endpoints
    // ═══════════════════════════════════════════════════════════════════════
    {
      name: 'GET /loyalty/points — no token → 401',
      method: 'GET',
      path: '/loyalty/points',
      auth: 'none',
      expect: { status: 401 },
    },
    {
      name: 'GET /loyalty/points — balance (customer)',
      method: 'GET',
      path: '/loyalty/points',
      auth: 'customer',
      expect: { status: 200 },
    },
    {
      name: 'GET /loyalty/transactions — history (customer)',
      method: 'GET',
      path: '/loyalty/transactions',
      auth: 'customer',
      expect: { status: 200 },
    },
    {
      name: 'GET /loyalty/catalog — active catalog (public)',
      method: 'GET',
      path: '/loyalty/catalog',
      auth: 'none',
      expect: { status: 200 },
    },
    {
      name: 'GET /loyalty/redemptions — my redemptions (customer)',
      method: 'GET',
      path: '/loyalty/redemptions',
      auth: 'customer',
      expect: { status: 200 },
    },
    {
      // catalog 1 = 300 pts freeship, customer nguyenvana has 1200 pts → should succeed
      name: 'POST /loyalty/redeem — đổi 300 điểm lấy phiếu freeship (catalog id=1)',
      method: 'POST',
      path: '/loyalty/redeem',
      auth: 'customer',
      body: { catalogId: 1 },
      extract: { testRedemptionCoupon: 'data.maCoupon' },
      expect: { status: 201, contains: 'maCoupon' },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LOYALTY — Admin endpoints
    // ═══════════════════════════════════════════════════════════════════════
    {
      name: 'GET /admin/loyalty/rules — list earn rules (admin)',
      method: 'GET',
      path: '/admin/loyalty/rules',
      auth: 'admin',
      expect: { status: 200 },
    },
    {
      name: 'POST /admin/loyalty/rules — create earn rule',
      method: 'POST',
      path: '/admin/loyalty/rules',
      auth: 'admin',
      body: {
        name: '__Test Earn Rule API Runner__',
        description: 'Rule test tự động',
        pointsPerUnit: 1,
        spendPerUnit: 10000,
        minOrderValue: 50000,
        maxPointsPerOrder: 200,
        isActive: true,
        priority: 0,
      },
      extract: { testEarnRuleId: 'data.id' },
      expect: { status: 201 },
    },
    {
      name: 'PUT /admin/loyalty/rules/:id — update earn rule',
      method: 'PUT',
      path: '/admin/loyalty/rules/{{testEarnRuleId}}',
      auth: 'admin',
      body: {
        name: '__Test Earn Rule API Runner Updated__',
        pointsPerUnit: 2,
        spendPerUnit: 10000,
      },
      expect: { status: 200 },
    },
    {
      name: 'GET /admin/loyalty/catalog — all catalog items (admin)',
      method: 'GET',
      path: '/admin/loyalty/catalog',
      auth: 'admin',
      expect: { status: 200 },
    },
    {
      name: 'POST /admin/loyalty/catalog — create catalog item',
      method: 'POST',
      path: '/admin/loyalty/catalog',
      auth: 'admin',
      body: {
        ten: '__Test Catalog Item API Runner__',
        diemCan: 50,
        // promotion 1 (SALE10) is a coupon — valid for catalog
        promotionId: 1,
        laHoatDong: false,
        gioiHanTonKho: 10,
      },
      extract: { testCatalogId: 'data.id' },
      expect: { status: 201 },
    },
    {
      name: 'POST /admin/loyalty/adjust — adjust points manually',
      method: 'POST',
      path: '/admin/loyalty/adjust',
      auth: 'admin',
      body: {
        khachHangId: 1,
        diem: 10,
        moTa: 'Test manual adjustment từ API runner',
        loaiThamChieu: 'admin_adjust',
      },
      expect: { status: 201 },
    },
  ],
};
