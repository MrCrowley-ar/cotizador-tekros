import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSelectorModoAndRatioCultivo1742216200000 implements MigrationInterface {
  name = 'AddSelectorModoAndRatioCultivo1742216200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Add 'selector' to modo enum
    await queryRunner.query(
      `ALTER TYPE "descuentos_modo_enum" ADD VALUE IF NOT EXISTS 'selector'`,
    );

    // Add 'ratio_cultivo' to campo_condicion enum
    await queryRunner.query(
      `ALTER TYPE "descuento_condiciones_campo_enum" ADD VALUE IF NOT EXISTS 'ratio_cultivo'`,
    );

    // Add 'nombre' column to descuento_reglas (for selector option labels)
    await queryRunner.query(
      `ALTER TABLE "descuento_reglas" ADD COLUMN IF NOT EXISTS "nombre" character varying(100) NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "descuento_reglas" DROP COLUMN IF EXISTS "nombre"`,
    );
    // PostgreSQL does not support removing enum values natively.
  }
}
