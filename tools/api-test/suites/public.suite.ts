import type { TestSuite } from '../types';

export const publicSuite: TestSuite = {
  name: 'Public Endpoints',
  cases: [
    // ── Site Config ──────────────────────────────────────────────────────────
    {
      name: 'GET /site-config — returns config',
      method: 'GET',
      path: '/site-config',
      auth: 'none',
      expect: { status: 200, bodyMatch: { statusCode: 200, message: 'success' } },
    },

    // ── Categories ───────────────────────────────────────────────────────────
    {
      name: 'GET /categories — returns list',
      method: 'GET',
      path: '/categories',
      auth: 'none',
      expect: { status: 200, bodyMatch: { statusCode: 200 } },
    },

    // ── Brands ───────────────────────────────────────────────────────────────
    {
      name: 'GET /brands — returns list',
      method: 'GET',
      path: '/brands',
      auth: 'none',
      expect: { status: 200, bodyMatch: { statusCode: 200 } },
    },

    // ── Products ─────────────────────────────────────────────────────────────
    {
      name: 'GET /products — returns paginated list',
      method: 'GET',
      path: '/products',
      auth: 'none',
      expect: { status: 200, bodyMatch: { statusCode: 200 } },
    },
    {
      name: 'GET /products — filter by invalid category → still 200',
      method: 'GET',
      path: '/products',
      auth: 'none',
      query: { categoryId: 99999 },
      expect: { status: 200 },
    },

    // ── Flash Sales ──────────────────────────────────────────────────────────
    {
      name: 'GET /flash-sales/active — returns list',
      method: 'GET',
      path: '/flash-sales/active',
      auth: 'none',
      expect: { status: 200 },
    },

    // ── Promotions ───────────────────────────────────────────────────────────
    {
      name: 'GET /promotions/active — returns list',
      method: 'GET',
      path: '/promotions/active',
      auth: 'none',
      expect: { status: 200 },
    },

    // ── CMS ──────────────────────────────────────────────────────────────────
    {
      name: 'GET /banners — returns list',
      method: 'GET',
      path: '/banners',
      auth: 'none',
      expect: { status: 200 },
    },
    {
      name: 'GET /faq — returns list',
      method: 'GET',
      path: '/faq',
      auth: 'none',
      expect: { status: 200 },
    },
    {
      name: 'GET /homepage-sections — returns list',
      method: 'GET',
      path: '/homepage-sections',
      auth: 'none',
      expect: { status: 200 },
    },

    // ── Search — skip: 500 server error, FULLTEXT index cần được tạo thủ công
    {
      name: 'GET /search — skip: cần FULLTEXT index trên bảng san_pham',
      method: 'GET',
      path: '/search',
      auth: 'none',
      query: { q: 'laptop' },
      skip: true,
      expect: { status: 200 },
    },
    {
      name: 'GET /search/suggestions — skip: cần FULLTEXT index',
      method: 'GET',
      path: '/search/suggestions',
      auth: 'none',
      query: { q: 'cpu' },
      skip: true,
      expect: { status: 200 },
    },

    // ── Auth-required public routes ───────────────────────────────────────────
    {
      name: 'GET /cart — authenticated customer',
      method: 'GET',
      path: '/cart',
      auth: 'customer',
      expect: { status: 200 },
    },
    {
      name: 'GET /cart — unauthenticated → 401',
      method: 'GET',
      path: '/cart',
      auth: 'none',
      expect: { status: 401 },
    },
    {
      name: 'GET /wishlist — authenticated customer',
      method: 'GET',
      path: '/wishlist',
      auth: 'customer',
      expect: { status: 200 },
    },
    {
      name: 'GET /notifications — authenticated customer',
      method: 'GET',
      path: '/notifications',
      auth: 'customer',
      expect: { status: 200 },
    },
    {
      name: 'GET /loyalty/points — authenticated customer',
      method: 'GET',
      path: '/loyalty/points',
      auth: 'customer',
      expect: { status: 200 },
    },
    {
      name: 'GET /orders — authenticated customer',
      method: 'GET',
      path: '/orders',
      auth: 'customer',
      expect: { status: 200 },
    },
    {
      name: 'GET /settings/public — public settings',
      method: 'GET',
      path: '/settings/public',
      auth: 'none',
      expect: { status: 200 },
    },
  ],
};
