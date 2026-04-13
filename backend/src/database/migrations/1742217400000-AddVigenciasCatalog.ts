import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVigenciasCatalog1742217400000 implements MigrationInterface {
  name = 'AddVigenciasCatalog1742217400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Catálogo de vigencias configurado desde Datos > Vigencia.
    // - Una fila con cultivo_id = NULL = vigencia global.
    // - Filas con cultivo_id ≠ NULL = vigencia por cultivo.
    // La app impone el modo exclusivo (global ó por cultivo).
    await queryRunner.query(`
      CREATE TABLE "vigencias" (
        "id" SERIAL PRIMARY KEY,
        "cultivo_id" integer NULL REFERENCES "cultivos"("id") ON DELETE CASCADE,
        "fecha_vigencia" date NOT NULL
      )
    `);
    // Índice único para la fila global (solo puede haber una)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_vigencias_global"
      ON "vigencias" ((cultivo_id IS NULL))
      WHERE cultivo_id IS NULL
    `);
    // Índice único por cultivo (solo una vigencia por cultivo)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_vigencias_cultivo"
      ON "vigencias" ("cultivo_id")
      WHERE cultivo_id IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_vigencias_cultivo"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_vigencias_global"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vigencias"`);
  }
}
