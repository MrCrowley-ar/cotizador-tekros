import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class SeedAdminUser1742215500000 implements MigrationInterface {
  name = 'SeedAdminUser1742215500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hash = await bcrypt.hash('Tekros2026!', 10);
    await queryRunner.query(`
      INSERT INTO usuarios (nombre, email, password, rol, activo)
      VALUES ('NicoB', 'nicolas.bergmann@tekros.org', '${hash}', 'admin', true)
      ON CONFLICT (email) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM usuarios WHERE email = 'nicolas.bergmann@tekros.org'
    `);
  }
}
