import type { TestSuite } from '../types';

// ─── Phase 6: Reviews · Returns · Support Tickets ────────────────────────────
// Existing seed data:
//   review_id 1 (variant 1, order 1, customer 1, Approved)
//   review_id 2 (variant 12, order 1, customer 1, Approved)
//   review_id 3 (variant 23, order 2, customer 2, Approved)
//   return_id 1 (order 8, customer 3, DaDuyet) | return_id 2 (order 1, customer 1, TuChoi)
//   return_id 3 (order 2, customer 2, DangXuLy)
//   ticket_id 1 (customer 1, DaDong) | ticket_id 2 (DangXuLy) | ticket_id 5 (Moi)
//
// Return window = 7 days → orders from Mar 2025 are past window → 403 on submit
// Review duplicate → POST with same variant+order → 409
// ──────────────────────────────────────────────────────────────────────────────

export const phase6Suite: TestSuite = {
  name: 'Phase 6 — Reviews, Returns, Support Tickets',
  cases: [
    // ═══════════════════════════════════════════════════════════════════════
    // REVIEWS — Public & Customer
    // ═══════════════════════════════════════════════════════════════════════
    {
      name: 'GET /products/:id/reviews — approved reviews for product (public)',
      method: 'GET',
      path: '/products/1/reviews',
      auth: 'none',
      query: { page: 1, limit: 10 },
      expect: { status: 200, contains: 'items' },
    },
    {
      name: 'GET /products/:id/reviews — product with no reviews → 200 empty',
      method: 'GET',
      path: '/products/999/reviews',
      auth: 'none',
      expect: { status: 200 },
    },
    {
      name: 'POST /reviews — no token → 401',
      method: 'POST',
      path: '/reviews',
      auth: 'none',
      body: { variantId: 1, orderId: 1, rating: 5 },
      expect: { status: 401 },
    },
    {
      // Customer 1 already reviewed variant 1 for order 1 → should get 409
      name: 'POST /reviews — duplicate review (variant 1, order 1) → 409',
      method: 'POST',
      path: '/reviews',
      auth: 'customer',
      body: {
        variantId: 1,
        orderId: 1,
        rating: 5,
        title: 'Duplicate test',
        content: 'Đây là test duplicate từ API runner',
      },
      expect: { status: 409 },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // REVIEWS — Admin
    // ═══════════════════════════════════════════════════════════════════════
    {
      name: 'GET /admin/reviews — no token → 401',
      method: 'GET',
      path: '/admin/reviews',
      auth: 'none',
      expect: { status: 401 },
    },
    {
      name: 'GET /admin/reviews — list all (admin)',
      method: 'GET',
      path: '/admin/reviews',
      auth: 'admin',
      expect: { status: 200, contains: 'items' },
    },
    {
      name: 'GET /admin/reviews?status=Approved — filter by status',
      method: 'GET',
      path: '/admin/reviews',
      auth: 'admin',
      query: { status: 'Approved' },
      expect: { status: 200 },
    },
    {
      name: 'GET /admin/reviews?status=Pending — filter pending',
      method: 'GET',
      path: '/admin/reviews',
      auth: 'admin',
      query: { status: 'Pending' },
      expect: { status: 200 },
    },
    {
      name: 'GET /admin/reviews/:id/messages — reply history (review 1)',
      method: 'GET',
      path: '/admin/reviews/1/messages',
      auth: 'admin',
      expect: { status: 200 },
    },
    {
      name: 'POST /admin/reviews/:id/reply — staff reply to review (review 2)',
      method: 'POST',
      path: '/admin/reviews/2/reply',
      auth: 'admin',
      body: {
        content: 'Cảm ơn bạn đã đánh giá! Chúng tôi rất vui khi bạn hài lòng.',
        messageType: 'Reply',
      },
      expect: { status: 201 },
    },
    {
      name: 'PUT /admin/reviews/:id/hide — ẩn review 3',
      method: 'PUT',
      path: '/admin/reviews/3/hide',
      auth: 'admin',
      body: { reason: 'Nội dung vi phạm quy định kiểm duyệt' },
      expect: { status: 200 },
    },
    {
      // review 3 is now Hidden; approve should work (re-approve)
      name: 'PUT /admin/reviews/:id/approve — duyệt lại review 3',
      method: 'PUT',
      path: '/admin/reviews/3/approve',
      auth: 'admin',
      expect: { status: 200 },
    },
    {
      name: 'PUT /admin/reviews/:id/reject — từ chối review 4',
      method: 'PUT',
      path: '/admin/reviews/4/reject',
      auth: 'admin',
      body: { reason: 'Nội dung không liên quan đến sản phẩm' },
      expect: { status: 200 },
    },
    {
      // re-approve 4 to restore state
      name: 'PUT /admin/reviews/:id/approve — duyệt lại review 4 (restore)',
      method: 'PUT',
      path: '/admin/reviews/4/approve',
      auth: 'admin',
      expect: { status: 200 },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // RETURNS — Customer
    // ═══════════════════════════════════════════════════════════════════════
    {
      name: 'GET /returns — no token → 401',
      method: 'GET',
      path: '/returns',
      auth: 'none',
      expect: { status: 401 },
    },
    {
      name: 'GET /returns — my returns (customer)',
      method: 'GET',
      path: '/returns',
      auth: 'customer',
      expect: { status: 200, contains: 'items' },
    },
    {
      // Order 7 belongs to customer 1 but status = DaHuy (cancelled) → 403 (not delivered)
      name: 'POST /returns — cancelled order → 403',
      method: 'POST',
      path: '/returns',
      auth: 'customer',
      body: {
        orderId: 7,
        requestType: 'TraHang',
        reason: 'LoiKyThuat',
        description: 'Test return từ API runner — đơn đã hủy',
      },
      expect: { status: 403 },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // RETURNS — Admin
    // ═══════════════════════════════════════════════════════════════════════
    {
      name: 'GET /admin/returns — no token → 401',
      method: 'GET',
      path: '/admin/returns',
      auth: 'none',
      expect: { status: 401 },
    },
    {
      name: 'GET /admin/returns — list all (admin)',
      method: 'GET',
      path: '/admin/returns',
      auth: 'admin',
      expect: { status: 200, contains: 'items' },
    },
    {
      name: 'GET /admin/returns?status=DaDuyet — filter by status',
      method: 'GET',
      path: '/admin/returns',
      auth: 'admin',
      query: { status: 'DaDuyet' },
      expect: { status: 200 },
    },
    {
      name: 'GET /admin/returns/:id/assets — proof assets (id=1)',
      method: 'GET',
      path: '/admin/returns/1/assets',
      auth: 'admin',
      expect: { status: 200 },
    },
    {
      name: 'PUT /admin/returns/:id/status — process return (id=2, TuChoi → DaDuyet)',
      method: 'PUT',
      path: '/admin/returns/2/status',
      auth: 'admin',
      body: {
        status: 'DaDuyet',
        inspectionResult: 'LoiNhaSanXuat',
        resolution: 'GiaoHangMoi',
      },
      expect: { status: 200 },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // SUPPORT TICKETS — Customer
    // ═══════════════════════════════════════════════════════════════════════
    {
      name: 'GET /support/tickets — no token → 401',
      method: 'GET',
      path: '/support/tickets',
      auth: 'none',
      expect: { status: 401 },
    },
    {
      name: 'GET /support/tickets — my tickets (customer)',
      method: 'GET',
      path: '/support/tickets',
      auth: 'customer',
      expect: { status: 200, contains: 'items' },
    },
    {
      name: 'POST /support/tickets — open new ticket',
      method: 'POST',
      path: '/support/tickets',
      auth: 'customer',
      body: {
        issueType: 'KhuyenMai',
        priority: 'TrungBinh',
        title: '__Test Ticket từ API Runner__',
        description: 'Đây là ticket test được tạo tự động bởi API runner để kiểm tra hệ thống.',
        channel: 'Form',
      },
      extract: { testTicketId: 'data.id' },
      expect: { status: 201 },
    },
    {
      name: 'GET /support/tickets/:id — detail of created ticket',
      method: 'GET',
      path: '/support/tickets/{{testTicketId}}',
      auth: 'customer',
      expect: { status: 200, contains: 'ticketCode' },
    },
    {
      name: 'POST /support/tickets/:id/messages — customer sends message',
      method: 'POST',
      path: '/support/tickets/{{testTicketId}}/messages',
      auth: 'customer',
      body: { content: 'Xin chào, tôi cần hỗ trợ thêm về vấn đề này.' },
      expect: { status: 201 },
    },
    {
      name: 'GET /support/tickets/:id/messages — message history',
      method: 'GET',
      path: '/support/tickets/{{testTicketId}}/messages',
      auth: 'customer',
      expect: { status: 200 },
    },
    {
      name: 'GET /support/tickets/:id — wrong customer → 404',
      method: 'GET',
      // ticket 2 belongs to customer 7 (leminhc), not to customer 1 (nguyenvana)
      path: '/support/tickets/2',
      auth: 'customer',
      expect: { status: 404 },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // SUPPORT TICKETS — Admin
    // ═══════════════════════════════════════════════════════════════════════
    {
      name: 'GET /admin/tickets — no token → 401',
      method: 'GET',
      path: '/admin/tickets',
      auth: 'none',
      expect: { status: 401 },
    },
    {
      name: 'GET /admin/tickets — list all (admin)',
      method: 'GET',
      path: '/admin/tickets',
      auth: 'admin',
      expect: { status: 200, contains: 'items' },
    },
    {
      name: 'GET /admin/tickets?status=Moi — filter new tickets',
      method: 'GET',
      path: '/admin/tickets',
      auth: 'admin',
      query: { status: 'Moi' },
      expect: { status: 200 },
    },
    {
      name: 'GET /admin/tickets/:id — detail (created ticket)',
      method: 'GET',
      path: '/admin/tickets/{{testTicketId}}',
      auth: 'admin',
      expect: { status: 200 },
    },
    {
      name: 'PUT /admin/tickets/:id/assign — assign ticket to employee (id=6)',
      method: 'PUT',
      path: '/admin/tickets/{{testTicketId}}/assign',
      auth: 'admin',
      body: { employeeId: 6 },
      expect: { status: 200 },
    },
    {
      name: 'POST /admin/tickets/:id/messages — staff sends reply',
      method: 'POST',
      path: '/admin/tickets/{{testTicketId}}/messages',
      auth: 'admin',
      body: {
        content: 'Xin chào, chúng tôi đang xem xét yêu cầu của bạn.',
        messageType: 'Reply',
      },
      expect: { status: 201 },
    },
    {
      name: 'POST /admin/tickets/:id/messages — internal note',
      method: 'POST',
      path: '/admin/tickets/{{testTicketId}}/messages',
      auth: 'admin',
      body: {
        content: 'Ghi chú nội bộ: đây là test case từ API runner.',
        messageType: 'InternalNote',
      },
      expect: { status: 201 },
    },
    {
      name: 'GET /admin/tickets/:id/messages — full message history (incl. internal notes)',
      method: 'GET',
      path: '/admin/tickets/{{testTicketId}}/messages',
      auth: 'admin',
      expect: { status: 200 },
    },
    {
      name: 'PUT /admin/tickets/:id/close — close ticket',
      method: 'PUT',
      path: '/admin/tickets/{{testTicketId}}/close',
      auth: 'admin',
      expect: { status: 200 },
    },
    {
      name: 'PUT /admin/tickets/:id/reopen — reopen closed ticket',
      method: 'PUT',
      path: '/admin/tickets/{{testTicketId}}/reopen',
      auth: 'admin',
      expect: { status: 200 },
    },
    {
      name: 'GET /admin/tickets/:id — not found → 404',
      method: 'GET',
      path: '/admin/tickets/99999',
      auth: 'admin',
      expect: { status: 404 },
    },
  ],
};
