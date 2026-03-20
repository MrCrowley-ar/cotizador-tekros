import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVolumenToHibrido1742215600000 implements MigrationInterface {
  name = 'AddVolumenToHibrido1742215600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE hibridos ADD COLUMN volumen decimal(10,2) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE hibridos DROP COLUMN volumen`);
  }
}
