import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddEsComisionToDescuentos1742217300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'descuentos',
      new TableColumn({
        name: 'es_comision',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    );

    await queryRunner.addColumn(
      'cotizacion_item_descuentos',
      new TableColumn({
        name: 'es_comision',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    );

    await queryRunner.addColumn(
      'cotizacion_descuentos',
      new TableColumn({
        name: 'es_comision',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('cotizacion_descuentos', 'es_comision');
    await queryRunner.dropColumn('cotizacion_item_descuentos', 'es_comision');
    await queryRunner.dropColumn('descuentos', 'es_comision');
  }
}
