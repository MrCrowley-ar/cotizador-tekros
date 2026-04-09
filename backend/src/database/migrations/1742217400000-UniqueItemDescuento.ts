import { MigrationInterface, QueryRunner } from 'typeorm';

export class UniqueItemDescuento1742217400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove duplicate entries, keeping only the one with the highest id per (cotizacion_item_id, descuento_id)
    await queryRunner.query(`
      DELETE FROM cotizacion_item_descuentos
      WHERE id NOT IN (
        SELECT MAX(id)
        FROM cotizacion_item_descuentos
        GROUP BY cotizacion_item_id, descuento_id
      )
    `);

    // Add unique constraint to prevent future duplicates
    await queryRunner.query(`
      ALTER TABLE cotizacion_item_descuentos
      ADD CONSTRAINT "UQ_item_descuento" UNIQUE ("cotizacion_item_id", "descuento_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cotizacion_item_descuentos
      DROP CONSTRAINT IF EXISTS "UQ_item_descuento"
    `);
  }
}
