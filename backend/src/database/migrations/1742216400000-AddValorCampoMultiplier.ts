import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddValorCampoMultiplier1742216400000 implements MigrationInterface {
  name = 'AddValorCampoMultiplier1742216400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Permite condiciones relativas: campo op (valorMultiplier × valorCampo)
    await queryRunner.query(
      `ALTER TABLE "descuento_condiciones"
         ADD COLUMN IF NOT EXISTS "valor_campo" "descuento_condiciones_campo_enum" NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "descuento_condiciones"
         ADD COLUMN IF NOT EXISTS "valor_multiplier" DECIMAL(8,6) NULL`,
    );

    // Hacer valor nullable (para condiciones relativas no se necesita un valor fijo)
    await queryRunner.query(
      `ALTER TABLE "descuento_condiciones" ALTER COLUMN "valor" SET DEFAULT 0`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "descuento_condiciones" DROP COLUMN IF EXISTS "valor_multiplier"`,
    );
    await queryRunner.query(
      `ALTER TABLE "descuento_condiciones" DROP COLUMN IF EXISTS "valor_campo"`,
    );
    await queryRunner.query(
      `ALTER TABLE "descuento_condiciones" ALTER COLUMN "valor" DROP DEFAULT`,
    );
  }
}
