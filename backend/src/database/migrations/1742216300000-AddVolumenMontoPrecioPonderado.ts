import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVolumenMontoPrecioPonderado1742216300000 implements MigrationInterface {
  name = 'AddVolumenMontoPrecioPonderado1742216300000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Nuevas variables de condición: agregados de cotización a nivel cultivo o global
    await queryRunner.query(
      `ALTER TYPE "descuento_condiciones_campo_enum" ADD VALUE IF NOT EXISTS 'volumen'`,
    );
    await queryRunner.query(
      `ALTER TYPE "descuento_condiciones_campo_enum" ADD VALUE IF NOT EXISTS 'monto'`,
    );
    await queryRunner.query(
      `ALTER TYPE "descuento_condiciones_campo_enum" ADD VALUE IF NOT EXISTS 'precio_ponderado'`,
    );
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL no soporta eliminar valores de enum natively.
  }
}
