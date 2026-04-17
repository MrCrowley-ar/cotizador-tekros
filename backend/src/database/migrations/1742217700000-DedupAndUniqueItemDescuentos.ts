import { MigrationInterface, QueryRunner } from 'typeorm';

export class DedupAndUniqueItemDescuentos1742217700000 implements MigrationInterface {
  name = 'DedupAndUniqueItemDescuentos1742217700000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Deduplicar cotizacion_item_descuentos: mantener la fila con mayor id
    // (la más reciente) por (cotizacion_item_id, descuento_id, seccion_id).
    // IS NOT DISTINCT FROM trata NULL como igual a NULL.
    await queryRunner.query(`
      DELETE FROM "cotizacion_item_descuentos" t1
      USING "cotizacion_item_descuentos" t2
      WHERE t1.id < t2.id
        AND t1.cotizacion_item_id = t2.cotizacion_item_id
        AND t1.descuento_id IS NOT DISTINCT FROM t2.descuento_id
        AND t1.seccion_id IS NOT DISTINCT FROM t2.seccion_id
    `);

    await queryRunner.query(`
      DELETE FROM "cotizacion_descuentos" t1
      USING "cotizacion_descuentos" t2
      WHERE t1.id < t2.id
        AND t1.version_id = t2.version_id
        AND t1.descuento_id IS NOT DISTINCT FROM t2.descuento_id
        AND t1.seccion_id IS NOT DISTINCT FROM t2.seccion_id
    `);

    // UNIQUE NULLS NOT DISTINCT (PostgreSQL 15+) trata filas con NULL como
    // duplicados; PG 16 en uso según docker-compose.
    await queryRunner.query(`
      ALTER TABLE "cotizacion_item_descuentos"
      ADD CONSTRAINT "UQ_cid_item_desc_seccion"
      UNIQUE NULLS NOT DISTINCT (cotizacion_item_id, descuento_id, seccion_id)
    `);

    await queryRunner.query(`
      ALTER TABLE "cotizacion_descuentos"
      ADD CONSTRAINT "UQ_cd_version_desc_seccion"
      UNIQUE NULLS NOT DISTINCT (version_id, descuento_id, seccion_id)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cotizacion_descuentos" DROP CONSTRAINT IF EXISTS "UQ_cd_version_desc_seccion"
    `);
    await queryRunner.query(`
      ALTER TABLE "cotizacion_item_descuentos" DROP CONSTRAINT IF EXISTS "UQ_cid_item_desc_seccion"
    `);
  }
}
