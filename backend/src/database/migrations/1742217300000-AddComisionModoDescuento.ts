import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddComisionModoDescuento1742217300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add 'comision' value to descuentos_modo_enum
    await queryRunner.query(
      `ALTER TYPE "descuentos_modo_enum" ADD VALUE IF NOT EXISTS 'comision'`,
    );

    // Add comision_margen column to descuentos
    await queryRunner.addColumn(
      'descuentos',
      new TableColumn({
        name: 'comision_margen',
        type: 'decimal',
        precision: 5,
        scale: 2,
        isNullable: true,
      }),
    );

    // Add comision_descuento_id column to descuentos (FK to descuentos.id)
    await queryRunner.addColumn(
      'descuentos',
      new TableColumn({
        name: 'comision_descuento_id',
        type: 'integer',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('descuentos', 'comision_descuento_id');
    await queryRunner.dropColumn('descuentos', 'comision_margen');
    // Note: PostgreSQL does not support removing enum values
  }
}
