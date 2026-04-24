import type { TestSuite } from '../types';

export const authSuite: TestSuite = {
  name: 'Auth',
  cases: [
    {
      name: 'Customer login — success',
      method: 'POST',
      path: '/auth/login',
      auth: 'none',
      body: { email: 'nguyenvana@gmail.com', matKhau: 'Admin@123' },
      extract: { customerToken: 'data.accessToken' },
      expect: {
        status: 200,
        contains: 'accessToken',
      },
    },
    {
      name: 'Admin login — success',
      method: 'POST',
      path: '/auth/admin/login',
      auth: 'none',
      body: { email: 'admin@pcstore.vn', matKhau: 'Admin@123' },
      extract: { adminToken: 'data.accessToken' },
      expect: {
        status: 200,
        contains: 'accessToken',
      },
    },
    {
      name: 'Customer login — wrong password → 401',
      method: 'POST',
      path: '/auth/login',
      auth: 'none',
      body: { email: 'nguyenvana@gmail.com', matKhau: 'WrongPassword!' },
      expect: { status: 401 },
    },
    {
      name: 'Customer login — non-existent email → 401',
      method: 'POST',
      path: '/auth/login',
      auth: 'none',
      body: { email: 'nobody@nowhere.com', matKhau: 'anything' },
      expect: { status: 401 },
    },
    {
      name: 'GET /me — authenticated customer',
      method: 'GET',
      path: '/auth/me',
      auth: 'customer',
      expect: {
        status: 200,
        bodyMatch: { 'data.type': 'customer', 'data.email': 'nguyenvana@gmail.com' },
      },
    },
    {
      name: 'GET /me — no token → 401',
      method: 'GET',
      path: '/auth/me',
      auth: 'none',
      expect: { status: 401 },
    },
    {
      name: 'Register — validation error (bad email, missing required) → 400',
      method: 'POST',
      path: '/auth/register',
      auth: 'none',
      body: { email: 'not-an-email' },
      expect: { status: 400 },
    },
    {
      name: 'Register — duplicate email → 409',
      method: 'POST',
      path: '/auth/register',
      auth: 'none',
      body: { email: 'nguyenvana@gmail.com', matKhau: 'Test@1234', hoTen: 'Test' },
      expect: { status: 409 },
    },
    {
      name: 'Locked customer login → 401',
      method: 'POST',
      path: '/auth/login',
      auth: 'none',
      body: { email: 'buivanhung@gmail.com', matKhau: 'Admin@123' },
      expect: { status: 401 },
    },
  ],
};
