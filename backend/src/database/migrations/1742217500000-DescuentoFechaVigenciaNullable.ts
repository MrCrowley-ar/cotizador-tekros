import { MigrationInterface, QueryRunner } from 'typeorm';

export class DescuentoFechaVigenciaNullable1742217500000 implements MigrationInterface {
  name = 'DescuentoFechaVigenciaNullable1742217500000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // La vigencia se movió a nivel de cotización por cultivo.
    // Se conserva la columna para mantener el historial, pero se permite NULL
    // para que los nuevos descuentos no necesiten proveerla.
    await queryRunner.query(`
      ALTER TABLE "descuentos" ALTER COLUMN "fecha_vigencia" DROP NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "descuentos" SET "fecha_vigencia" = CURRENT_DATE WHERE "fecha_vigencia" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "descuentos" ALTER COLUMN "fecha_vigencia" SET NOT NULL
    `);
  }
}
