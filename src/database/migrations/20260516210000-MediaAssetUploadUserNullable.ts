import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Allow customer-side uploads (e.g. return-request evidence images) to land in
 * `media_asset` without requiring an employee uploader. The column was modelled
 * for the admin media library originally — customer flows leave it NULL.
 */
export class MediaAssetUploadUserNullable20260516210000 implements MigrationInterface {
  name = 'MediaAssetUploadUserNullable20260516210000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`media_asset\`
      MODIFY COLUMN \`nguoi_upload_id\` INT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`media_asset\`
      MODIFY COLUMN \`nguoi_upload_id\` INT NOT NULL
    `);
  }
}
