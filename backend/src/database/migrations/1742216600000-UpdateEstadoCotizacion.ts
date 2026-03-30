import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateEstadoCotizacion1742216600000 implements MigrationInterface {
  name = 'UpdateEstadoCotizacion1742216600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Add new enum values (must be in a separate transaction from any queries that use them)
    await queryRunner.query(`ALTER TYPE "cotizaciones_estado_enum" ADD VALUE IF NOT EXISTS 'generado'`);
    await queryRunner.query(`ALTER TYPE "cotizaciones_estado_enum" ADD VALUE IF NOT EXISTS 'enviado'`);
    await queryRunner.query(`ALTER TYPE "cotizaciones_estado_enum" ADD VALUE IF NOT EXISTS 'aceptado'`);
    await queryRunner.query(`ALTER TYPE "cotizaciones_estado_enum" ADD VALUE IF NOT EXISTS 'perdido'`);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing enum values natively.
  }
}
