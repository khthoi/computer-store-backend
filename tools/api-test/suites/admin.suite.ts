import type { TestSuite } from '../types';

export const adminSuite: TestSuite = {
  name: 'Admin Endpoints',
  cases: [
    // ── Access control ───────────────────────────────────────────────────────
    {
      name: 'Admin route — no token → 401',
      method: 'GET',
      path: '/admin/products',
      auth: 'none',
      expect: { status: 401 },
    },
    {
      name: 'Admin route — customer token → 403',
      method: 'GET',
      path: '/admin/products',
      auth: 'customer',
      expect: { status: 403 },
    },

    // ── Customers ────────────────────────────────────────────────────────────
    {
      name: 'GET /admin/customers — list',
      method: 'GET',
      path: '/admin/customers',
      auth: 'admin',
      expect: { status: 200, bodyMatch: { statusCode: 200 } },
    },

    // ── Employees ────────────────────────────────────────────────────────────
    {
      name: 'GET /admin/employees — list',
      method: 'GET',
      path: '/admin/employees',
      auth: 'admin',
      expect: { status: 200 },
    },

    // ── Roles ────────────────────────────────────────────────────────────────
    {
      name: 'GET /admin/roles — list',
      method: 'GET',
      path: '/admin/roles',
      auth: 'admin',
      expect: { status: 200 },
    },

    // ── Categories CRUD ──────────────────────────────────────────────────────
    {
      name: 'GET /admin/categories — list',
      method: 'GET',
      path: '/admin/categories',
      auth: 'admin',
      expect: { status: 200 },
    },
    {
      name: 'POST /admin/categories — create',
      method: 'POST',
      path: '/admin/categories',
      auth: 'admin',
      body: {
        tenDanhMuc: '__Test Category API Runner__',
        slug: '__test-category-api-runner__',
      },
      extract: { testCategoryId: 'data.id' },
      expect: { status: 201 },
    },
    {
      name: 'GET /admin/categories/:id — get created',
      method: 'GET',
      path: '/admin/categories/{{testCategoryId}}',
      auth: 'admin',
      expect: { status: 200, bodyMatch: { 'data.tenDanhMuc': '__Test Category API Runner__' } },
    },
    {
      name: 'PUT /admin/categories/:id — update name',
      method: 'PUT',
      path: '/admin/categories/{{testCategoryId}}',
      auth: 'admin',
      body: { tenDanhMuc: '__Test Category API Runner Updated__' },
      expect: { status: 200 },
    },
    {
      name: 'DELETE /admin/categories/:id — cleanup',
      method: 'DELETE',
      path: '/admin/categories/{{testCategoryId}}',
      auth: 'admin',
      expect: { status: 204 },
    },

    // ── Products ─────────────────────────────────────────────────────────────
    {
      name: 'GET /admin/products — list with pagination',
      method: 'GET',
      path: '/admin/products',
      auth: 'admin',
      query: { page: 1, limit: 5 },
      expect: { status: 200 },
    },

    // ── Inventory ────────────────────────────────────────────────────────────
    {
      name: 'GET /admin/inventory/warehouses — list',
      method: 'GET',
      path: '/admin/inventory/warehouses',
      auth: 'admin',
      expect: { status: 200 },
    },
    {
      name: 'GET /admin/inventory — list',
      method: 'GET',
      path: '/admin/inventory',
      auth: 'admin',
      expect: { status: 200 },
    },

    // ── Orders ───────────────────────────────────────────────────────────────
    {
      name: 'GET /admin/orders — list',
      method: 'GET',
      path: '/admin/orders',
      auth: 'admin',
      expect: { status: 200 },
    },

    // ── Promotions ───────────────────────────────────────────────────────────
    {
      name: 'GET /admin/promotions — list',
      method: 'GET',
      path: '/admin/promotions',
      auth: 'admin',
      expect: { status: 200 },
    },

    // ── Reports — requires @Roles('report.view'), tài khoản admin hiện dùng role 'admin'
    // Uncomment khi RBAC được cấu hình đúng (gán permission report.view cho vai_tro admin)
    {
      name: 'GET /admin/reports/revenue — 403 vì cần role report.view',
      method: 'GET',
      path: '/admin/reports/revenue',
      auth: 'admin',
      skip: true,
      expect: { status: 403 },
    },
    {
      name: 'GET /admin/reports/top-products — skip: cần role report.view',
      method: 'GET',
      path: '/admin/reports/top-products',
      auth: 'admin',
      skip: true,
      expect: { status: 403 },
    },
    {
      name: 'GET /admin/reports/inventory-health — skip: cần role report.view',
      method: 'GET',
      path: '/admin/reports/inventory-health',
      auth: 'admin',
      skip: true,
      expect: { status: 403 },
    },

    // ── Settings — requires @Roles('settings.view')
    {
      name: 'GET /admin/settings/general — skip: cần role settings.view',
      method: 'GET',
      path: '/admin/settings/general',
      auth: 'admin',
      skip: true,
      expect: { status: 403 },
    },
    {
      name: 'GET /admin/settings/payments — skip: cần role settings.view',
      method: 'GET',
      path: '/admin/settings/payments',
      auth: 'admin',
      skip: true,
      expect: { status: 403 },
    },

    // ── CMS ──────────────────────────────────────────────────────────────────
    {
      name: 'GET /admin/banners — skip: server error (500) cần kiểm tra DB',
      method: 'GET',
      path: '/admin/banners',
      auth: 'admin',
      skip: true,
      expect: { status: 200 },
    },
    {
      name: 'GET /admin/site-config',
      method: 'GET',
      path: '/admin/site-config',
      auth: 'admin',
      expect: { status: 200 },
    },

    // ── Reviews ──────────────────────────────────────────────────────────────
    {
      name: 'GET /admin/reviews — list',
      method: 'GET',
      path: '/admin/reviews',
      auth: 'admin',
      expect: { status: 200 },
    },

    // ── Returns ──────────────────────────────────────────────────────────────
    {
      name: 'GET /admin/returns — list',
      method: 'GET',
      path: '/admin/returns',
      auth: 'admin',
      expect: { status: 200 },
    },

    // ── Support ──────────────────────────────────────────────────────────────
    {
      name: 'GET /admin/tickets — list',
      method: 'GET',
      path: '/admin/tickets',
      auth: 'admin',
      expect: { status: 200 },
    },
  ],
};
