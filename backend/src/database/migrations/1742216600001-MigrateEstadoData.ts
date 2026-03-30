import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateEstadoData1742216600001 implements MigrationInterface {
  name = 'MigrateEstadoData1742216600001';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Migrate existing data to new estado values (enum values were added in previous migration)
    await queryRunner.query(`UPDATE "cotizaciones" SET "estado" = 'generado' WHERE "estado" = 'borrador'`);
    await queryRunner.query(`UPDATE "cotizaciones" SET "estado" = 'enviado'  WHERE "estado" = 'enviada'`);
    await queryRunner.query(`UPDATE "cotizaciones" SET "estado" = 'aceptado' WHERE "estado" = 'aprobada'`);
    await queryRunner.query(`UPDATE "cotizaciones" SET "estado" = 'perdido'  WHERE "estado" IN ('rechazada', 'cerrada')`);

    // Update column default so new rows get 'generado'
    await queryRunner.query(`ALTER TABLE "cotizaciones" ALTER COLUMN "estado" SET DEFAULT 'generado'`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "cotizaciones" ALTER COLUMN "estado" SET DEFAULT 'borrador'`);
    await queryRunner.query(`UPDATE "cotizaciones" SET "estado" = 'borrador'  WHERE "estado" = 'generado'`);
    await queryRunner.query(`UPDATE "cotizaciones" SET "estado" = 'enviada'   WHERE "estado" = 'enviado'`);
    await queryRunner.query(`UPDATE "cotizaciones" SET "estado" = 'aprobada'  WHERE "estado" = 'aceptado'`);
    await queryRunner.query(`UPDATE "cotizaciones" SET "estado" = 'rechazada' WHERE "estado" = 'perdido'`);
  }
}
