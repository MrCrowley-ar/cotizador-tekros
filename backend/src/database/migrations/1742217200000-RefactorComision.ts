import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class RefactorComision1742217200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add comision_descuento_id column (FK to descuentos.id)
    await queryRunner.addColumn(
      'cotizacion_versiones',
      new TableColumn({
        name: 'comision_descuento_id',
        type: 'integer',
        isNullable: true,
      }),
    );

    await queryRunner.createForeignKey(
      'cotizacion_versiones',
      new TableForeignKey({
        columnNames: ['comision_descuento_id'],
        referencedTableName: 'descuentos',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Drop old comision_descuento column
    await queryRunner.dropColumn('cotizacion_versiones', 'comision_descuento');

    // Drop comision_pct from items
    await queryRunner.dropColumn('cotizacion_items', 'comision_pct');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add comision_pct to items
    await queryRunner.addColumn(
      'cotizacion_items',
      new TableColumn({
        name: 'comision_pct',
        type: 'decimal',
        precision: 5,
        scale: 2,
        isNullable: true,
      }),
    );

    // Re-add comision_descuento to versions
    await queryRunner.addColumn(
      'cotizacion_versiones',
      new TableColumn({
        name: 'comision_descuento',
        type: 'decimal',
        precision: 5,
        scale: 2,
        isNullable: true,
      }),
    );

    // Drop FK and comision_descuento_id
    const table = await queryRunner.getTable('cotizacion_versiones');
    const fk = table?.foreignKeys.find((fk) =>
      fk.columnNames.includes('comision_descuento_id'),
    );
    if (fk) await queryRunner.dropForeignKey('cotizacion_versiones', fk);
    await queryRunner.dropColumn('cotizacion_versiones', 'comision_descuento_id');
  }
}
