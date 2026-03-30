import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateEstadoCotizacion1742216600000 implements MigrationInterface {
  name = 'UpdateEstadoCotizacion1742216600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Add new enum values
    await queryRunner.query(`ALTER TYPE "cotizaciones_estado_enum" ADD VALUE IF NOT EXISTS 'generado'`);
    await queryRunner.query(`ALTER TYPE "cotizaciones_estado_enum" ADD VALUE IF NOT EXISTS 'enviado'`);
    await queryRunner.query(`ALTER TYPE "cotizaciones_estado_enum" ADD VALUE IF NOT EXISTS 'aceptado'`);
    await queryRunner.query(`ALTER TYPE "cotizaciones_estado_enum" ADD VALUE IF NOT EXISTS 'perdido'`);

    // Migrate existing data to new values
    await queryRunner.query(`UPDATE "cotizaciones" SET "estado" = 'generado' WHERE "estado" = 'borrador'`);
    await queryRunner.query(`UPDATE "cotizaciones" SET "estado" = 'enviado'  WHERE "estado" = 'enviada'`);
    await queryRunner.query(`UPDATE "cotizaciones" SET "estado" = 'aceptado' WHERE "estado" = 'aprobada'`);
    await queryRunner.query(`UPDATE "cotizaciones" SET "estado" = 'perdido'  WHERE "estado" IN ('rechazada', 'cerrada')`);

    // Update column default so new rows get 'generado'
    await queryRunner.query(`ALTER TABLE "cotizaciones" ALTER COLUMN "estado" SET DEFAULT 'generado'`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "cotizaciones" SET "estado" = 'borrador'  WHERE "estado" = 'generado'`);
    await queryRunner.query(`UPDATE "cotizaciones" SET "estado" = 'enviada'   WHERE "estado" = 'enviado'`);
    await queryRunner.query(`UPDATE "cotizaciones" SET "estado" = 'aprobada'  WHERE "estado" = 'aceptado'`);
    await queryRunner.query(`UPDATE "cotizaciones" SET "estado" = 'rechazada' WHERE "estado" = 'perdido'`);
  }
}
