import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubtotalItemsDescItemsTotal1742216500000 implements MigrationInterface {
  name = 'AddSubtotalItemsDescItemsTotal1742216500000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "descuento_condiciones_campo_enum" ADD VALUE IF NOT EXISTS 'subtotal_items'`,
    );
    await queryRunner.query(
      `ALTER TYPE "descuento_condiciones_campo_enum" ADD VALUE IF NOT EXISTS 'desc_items'`,
    );
    await queryRunner.query(
      `ALTER TYPE "descuento_condiciones_campo_enum" ADD VALUE IF NOT EXISTS 'total'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL no permite eliminar valores de enums; se requiere reconstrucción del tipo
  }
}
