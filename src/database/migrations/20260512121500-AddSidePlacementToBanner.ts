import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSidePlacementToBanner20260512121500 implements MigrationInterface {
  name = 'AddSidePlacementToBanner20260512121500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`banner_noi_dung\`
      ADD COLUMN \`vi_tri_side_banner\` enum('left','right') NULL AFTER \`url_hinh_anh_mobile\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`banner_noi_dung\`
      DROP COLUMN \`vi_tri_side_banner\`
    `);
  }
}
