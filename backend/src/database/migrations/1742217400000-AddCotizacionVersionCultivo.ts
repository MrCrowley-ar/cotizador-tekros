import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCotizacionVersionCultivo1742217400000 implements MigrationInterface {
  name = 'AddCotizacionVersionCultivo1742217400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "cotizacion_version_cultivos" (
        "id" SERIAL PRIMARY KEY,
        "version_id" integer NOT NULL REFERENCES "cotizacion_versiones"("id") ON DELETE CASCADE,
        "cultivo_id" integer NOT NULL REFERENCES "cultivos"("id") ON DELETE RESTRICT,
        "vigencia_desde" date NULL,
        "vigencia_hasta" date NULL,
        CONSTRAINT "UQ_cvc_version_cultivo" UNIQUE ("version_id", "cultivo_id")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "cotizacion_version_cultivos"`);
  }
}
