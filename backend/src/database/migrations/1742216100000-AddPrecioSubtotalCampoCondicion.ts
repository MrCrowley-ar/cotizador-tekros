import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPrecioSubtotalCampoCondicion1742216100000 implements MigrationInterface {
  name = 'AddPrecioSubtotalCampoCondicion1742216100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "descuento_condiciones_campo_enum" ADD VALUE IF NOT EXISTS 'precio'`,
    );
    await queryRunner.query(
      `ALTER TYPE "descuento_condiciones_campo_enum" ADD VALUE IF NOT EXISTS 'subtotal'`,
    );
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing enum values natively.
    // A full rollback would require recreating the type; omitted intentionally.
  }
}
