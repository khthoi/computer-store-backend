export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type AuthType = 'customer' | 'admin' | 'none';

export interface Expect {
  /** HTTP status code phải khớp — number hoặc mảng các code được chấp nhận */
  status: number | number[];
  /** Partial match theo dot-path, ví dụ: { 'data.email': 'a@b.com' } */
  bodyMatch?: Record<string, unknown>;
  /** Kiểm tra response body có chứa chuỗi này không */
  contains?: string;
  /** Kiểm tra header, ví dụ: { 'content-type': 'application/json' } */
  headers?: Record<string, string>;
}

export interface TestCase {
  name: string;
  method: HttpMethod;
  /** Path tương đối, không có /api prefix. Hỗ trợ {{varName}} */
  path: string;
  /** Loại auth. Mặc định là 'none' nếu không khai báo */
  auth?: AuthType;
  headers?: Record<string, string>;
  query?: Record<string, string | number>;
  body?: unknown;
  /** Trích xuất giá trị từ response để dùng cho test case sau.
   *  Key: tên biến, value: dot-path trong response body, ví dụ 'data.id' */
  extract?: Record<string, string>;
  expect: Expect;
  skip?: boolean;
}

export interface TestSuite {
  name: string;
  cases: TestCase[];
}

export interface TestResult {
  suite: string;
  name: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  httpStatus?: number;
  error?: string;
}

export type RunContext = Record<string, unknown>;
