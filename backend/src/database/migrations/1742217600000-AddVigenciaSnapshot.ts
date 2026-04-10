import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVigenciaSnapshot1742217600000 implements MigrationInterface {
  name = 'AddVigenciaSnapshot1742217600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Snapshot del catálogo de vigencias al momento de crear la cotización.
    // Formato: { modo: 'global', fecha: 'YYYY-MM-DD' }
    //        ó { modo: 'cultivo', fechas: { [cultivoId]: 'YYYY-MM-DD' } }
    await queryRunner.query(`
      ALTER TABLE "cotizacion_versiones"
      ADD COLUMN "vigencia_snapshot" jsonb NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cotizacion_versiones" DROP COLUMN IF EXISTS "vigencia_snapshot"
    `);
  }
}
