import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReglaIdToDescuentosAplicados1742217700000
  implements MigrationInterface
{
  name = 'AddReglaIdToDescuentosAplicados1742217700000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Regla específica seleccionada al momento de aplicar un descuento en modo
    // selector/avanzado. Guardarla permite distinguir entre reglas distintas
    // que comparten el mismo valor porcentual (p.ej. "Apertura 5%" vs
    // "Convencional 5%"), cosa que antes era ambigua.
    await queryRunner.query(`
      ALTER TABLE "cotizacion_descuentos"
      ADD COLUMN "regla_id" INTEGER NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "cotizacion_descuentos"
      ADD CONSTRAINT "FK_cotizacion_descuentos_regla_id"
      FOREIGN KEY ("regla_id") REFERENCES "descuento_reglas"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "cotizacion_item_descuentos"
      ADD COLUMN "regla_id" INTEGER NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "cotizacion_item_descuentos"
      ADD CONSTRAINT "FK_cotizacion_item_descuentos_regla_id"
      FOREIGN KEY ("regla_id") REFERENCES "descuento_reglas"("id") ON DELETE SET NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cotizacion_item_descuentos"
      DROP CONSTRAINT IF EXISTS "FK_cotizacion_item_descuentos_regla_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "cotizacion_item_descuentos" DROP COLUMN IF EXISTS "regla_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "cotizacion_descuentos"
      DROP CONSTRAINT IF EXISTS "FK_cotizacion_descuentos_regla_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "cotizacion_descuentos" DROP COLUMN IF EXISTS "regla_id"
    `);
  }
}
