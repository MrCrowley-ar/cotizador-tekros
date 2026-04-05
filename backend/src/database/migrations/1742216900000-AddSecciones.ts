import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSecciones1742216900000 implements MigrationInterface {
  name = 'AddSecciones1742216900000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "cotizacion_version_secciones" (
        "id" SERIAL PRIMARY KEY,
        "version_id" integer NOT NULL REFERENCES "cotizacion_versiones"("id") ON DELETE CASCADE,
        "nombre" character varying(200),
        "orden" integer NOT NULL DEFAULT 0
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "cotizacion_item_descuentos"
      ADD COLUMN "seccion_id" integer NULL REFERENCES "cotizacion_version_secciones"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "cotizacion_descuentos"
      ADD COLUMN "seccion_id" integer NULL REFERENCES "cotizacion_version_secciones"("id") ON DELETE CASCADE
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "cotizacion_descuentos" DROP COLUMN IF EXISTS "seccion_id"`);
    await queryRunner.query(`ALTER TABLE "cotizacion_item_descuentos" DROP COLUMN IF EXISTS "seccion_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cotizacion_version_secciones"`);
  }
}
