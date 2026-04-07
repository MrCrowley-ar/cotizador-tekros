import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddComisionToVersion1742217000000 implements MigrationInterface {
  name = 'AddComisionToVersion1742217000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cotizacion_versiones"
      ADD COLUMN "comision_margen" decimal(5,2) NULL,
      ADD COLUMN "comision_descuento" decimal(5,2) NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "cotizacion_versiones" DROP COLUMN IF EXISTS "comision_descuento"`);
    await queryRunner.query(`ALTER TABLE "cotizacion_versiones" DROP COLUMN IF EXISTS "comision_margen"`);
  }
}
