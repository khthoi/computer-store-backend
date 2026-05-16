import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImagesToProductReview20260516200000 implements MigrationInterface {
  name = 'AddImagesToProductReview20260516200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`danh_gia_san_pham\`
      ADD COLUMN \`hinh_anh\` JSON NULL AFTER \`noi_dung\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`danh_gia_san_pham\` DROP COLUMN \`hinh_anh\``);
  }
}
