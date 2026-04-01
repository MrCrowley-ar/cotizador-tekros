import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddManualModoDescuento1742216800000 implements MigrationInterface {
  name = 'AddManualModoDescuento1742216800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Check if value already exists (safe for re-runs)
    const [{ exists }] = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = 'descuentos_modo_enum'::regtype
          AND enumlabel = 'manual'
      ) AS exists
    `);
    if (!exists) {
      await queryRunner.query(
        `ALTER TYPE "descuentos_modo_enum" ADD VALUE IF NOT EXISTS 'manual'`,
      );
    }
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing enum values natively.
  }
}
