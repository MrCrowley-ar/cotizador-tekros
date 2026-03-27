import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameCantidadToBolsas1742215700000 implements MigrationInterface {
  name = 'RenameCantidadToBolsas1742215700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE cotizacion_items RENAME COLUMN cantidad TO bolsas`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE cotizacion_items RENAME COLUMN bolsas TO cantidad`,
    );
  }
}
