import { MigrationInterface, QueryRunner } from 'typeorm';

export class UniqueItemDescuento1742217400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove duplicate entries, keeping only the one with the highest id
    // per (cotizacion_item_id, descuento_id, seccion_id) tuple
    await queryRunner.query(`
      DELETE FROM cotizacion_item_descuentos
      WHERE id NOT IN (
        SELECT MAX(id)
        FROM cotizacion_item_descuentos
        GROUP BY cotizacion_item_id, descuento_id, seccion_id
      )
    `);

    // Add unique index to prevent future duplicates.
    // NULLS NOT DISTINCT ensures (item=1, desc=5, seccion=NULL) cannot be duplicated.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_item_descuento_seccion"
        ON cotizacion_item_descuentos (cotizacion_item_id, descuento_id, seccion_id)
        NULLS NOT DISTINCT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_item_descuento_seccion"
    `);
  }
}
