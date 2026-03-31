import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNombreToVersion1742216700000 implements MigrationInterface {
  name = 'AddNombreToVersion1742216700000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cotizacion_versiones" ADD COLUMN IF NOT EXISTS "nombre" character varying(200) NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cotizacion_versiones" DROP COLUMN IF EXISTS "nombre"`,
    );
  }
}
