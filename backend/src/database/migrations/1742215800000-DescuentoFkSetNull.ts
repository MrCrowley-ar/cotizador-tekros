import { MigrationInterface, QueryRunner } from 'typeorm';

export class DescuentoFkSetNull1742215800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // cotizacion_item_descuentos: allow descuento_id to be NULL + ON DELETE SET NULL
    await queryRunner.query(
      `ALTER TABLE "cotizacion_item_descuentos" ALTER COLUMN "descuento_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "cotizacion_item_descuentos" DROP CONSTRAINT "FK_cotizacion_item_descuentos_descuento_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cotizacion_item_descuentos"
         ADD CONSTRAINT "FK_cotizacion_item_descuentos_descuento_id"
         FOREIGN KEY ("descuento_id") REFERENCES "descuentos"("id") ON DELETE SET NULL`,
    );

    // cotizacion_descuentos: allow descuento_id to be NULL + ON DELETE SET NULL
    await queryRunner.query(
      `ALTER TABLE "cotizacion_descuentos" ALTER COLUMN "descuento_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "cotizacion_descuentos" DROP CONSTRAINT "FK_cotizacion_descuentos_descuento_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cotizacion_descuentos"
         ADD CONSTRAINT "FK_cotizacion_descuentos_descuento_id"
         FOREIGN KEY ("descuento_id") REFERENCES "descuentos"("id") ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert cotizacion_item_descuentos
    await queryRunner.query(
      `ALTER TABLE "cotizacion_item_descuentos" DROP CONSTRAINT "FK_cotizacion_item_descuentos_descuento_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cotizacion_item_descuentos"
         ADD CONSTRAINT "FK_cotizacion_item_descuentos_descuento_id"
         FOREIGN KEY ("descuento_id") REFERENCES "descuentos"("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "cotizacion_item_descuentos" ALTER COLUMN "descuento_id" SET NOT NULL`,
    );

    // Revert cotizacion_descuentos
    await queryRunner.query(
      `ALTER TABLE "cotizacion_descuentos" DROP CONSTRAINT "FK_cotizacion_descuentos_descuento_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cotizacion_descuentos"
         ADD CONSTRAINT "FK_cotizacion_descuentos_descuento_id"
         FOREIGN KEY ("descuento_id") REFERENCES "descuentos"("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "cotizacion_descuentos" ALTER COLUMN "descuento_id" SET NOT NULL`,
    );
  }
}
