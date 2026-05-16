import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLaChuanSoSanhToDanhMuc20260516120000 implements MigrationInterface {
  name = 'AddLaChuanSoSanhToDanhMuc20260516120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`danh_muc\`
      ADD COLUMN \`la_chuan_so_sanh\` TINYINT(1) NOT NULL DEFAULT 0 AFTER \`image_alt\`
    `);
    await queryRunner.query(`
      CREATE INDEX \`idx_dm_chuan_so_sanh\` ON \`danh_muc\` (\`la_chuan_so_sanh\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX \`idx_dm_chuan_so_sanh\` ON \`danh_muc\``);
    await queryRunner.query(`ALTER TABLE \`danh_muc\` DROP COLUMN \`la_chuan_so_sanh\``);
  }
}
