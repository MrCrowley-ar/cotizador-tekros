import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddComisionPctToItem1742217100000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cotizacion_items
      ADD COLUMN comision_pct DECIMAL(5,2) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cotizacion_items
      DROP COLUMN comision_pct
    `);
  }
}
