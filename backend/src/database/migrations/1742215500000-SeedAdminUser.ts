import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class SeedAdminUser1742215500000 implements MigrationInterface {
  name = 'SeedAdminUser1742215500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const nombre = process.env.INITIAL_ADMIN_NOMBRE || 'Admin';
    const email = process.env.INITIAL_ADMIN_EMAIL;
    const password = process.env.INITIAL_ADMIN_PASSWORD;

    if (!email || !password) {
      console.warn(
        '[SeedAdminUser] INITIAL_ADMIN_EMAIL o INITIAL_ADMIN_PASSWORD no definidos — saltando seed.',
      );
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    await queryRunner.query(
      `INSERT INTO usuarios (nombre, email, password, rol, activo)
       VALUES ($1, $2, $3, 'admin', true)
       ON CONFLICT (email) DO NOTHING`,
      [nombre, email, hash],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const email = process.env.INITIAL_ADMIN_EMAIL;
    if (email) {
      await queryRunner.query(`DELETE FROM usuarios WHERE email = $1`, [email]);
    }
  }
}
