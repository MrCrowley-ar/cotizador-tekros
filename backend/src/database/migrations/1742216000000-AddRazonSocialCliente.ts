import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRazonSocialCliente1742216000000 implements MigrationInterface {
  name = 'AddRazonSocialCliente1742216000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE clientes ADD COLUMN IF NOT EXISTS razon_social VARCHAR(300)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE clientes DROP COLUMN IF EXISTS razon_social`,
    );
  }
}
