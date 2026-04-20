import 'reflect-metadata';
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config();
import { DataSource } from 'typeorm';
import { seedPermissions } from './permission.seed';
import { seedRoles } from './role.seed';

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '3306', 10),
  username: process.env.DB_USERNAME ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'computer_store',
  entities: [__dirname + '/../../modules/**/entities/*.entity.{ts,js}'],
  synchronize: false,
  charset: 'utf8mb4',
});

async function run() {
  await AppDataSource.initialize();
  console.log('🔌 Database connected');

  try {
    await seedPermissions(AppDataSource);
    await seedRoles(AppDataSource);
    console.log('🎉 Seeding hoàn tất');
  } catch (err) {
    console.error('❌ Seed thất bại:', err);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

run();
