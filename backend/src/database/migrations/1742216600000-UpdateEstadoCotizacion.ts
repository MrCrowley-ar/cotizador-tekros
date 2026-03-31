import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateEstadoCotizacion1742216600000 implements MigrationInterface {
  name = 'UpdateEstadoCotizacion1742216600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Check if the new enum values already exist (from a previous failed attempt
    // where ADD VALUE succeeded but the transaction rolled back — PostgreSQL does
    // not roll back ADD VALUE).
    const [{ exists }] = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = 'cotizaciones_estado_enum'::regtype
          AND enumlabel = 'generado'
      ) AS exists
    `);

    if (exists) {
      // Values already exist in the current enum — just migrate data and set default
      await queryRunner.query(`UPDATE "cotizaciones" SET "estado" = 'generado' WHERE "estado" = 'borrador'`);
      await queryRunner.query(`UPDATE "cotizaciones" SET "estado" = 'enviado'  WHERE "estado" = 'enviada'`);
      await queryRunner.query(`UPDATE "cotizaciones" SET "estado" = 'aceptado' WHERE "estado" = 'aprobada'`);
      await queryRunner.query(`UPDATE "cotizaciones" SET "estado" = 'perdido'  WHERE "estado" IN ('rechazada', 'cerrada')`);
      await queryRunner.query(`ALTER TABLE "cotizaciones" ALTER COLUMN "estado" SET DEFAULT 'generado'`);
      return;
    }

    // Recreate the enum with all values (avoids ADD VALUE transaction limitation)

    // 1. Drop column default (can't alter type with a default set)
    await queryRunner.query(`ALTER TABLE "cotizaciones" ALTER COLUMN "estado" DROP DEFAULT`);

    // 2. Rename old enum
    await queryRunner.query(`ALTER TYPE "cotizaciones_estado_enum" RENAME TO "cotizaciones_estado_enum_old"`);

    // 3. Create new enum with all values (old + new)
    await queryRunner.query(`
      CREATE TYPE "cotizaciones_estado_enum" AS ENUM(
        'borrador', 'enviada', 'aprobada', 'rechazada', 'cerrada',
        'generado', 'enviado', 'aceptado', 'perdido'
      )
    `);

    // 4. Swap column to use the new enum
    await queryRunner.query(`
      ALTER TABLE "cotizaciones"
        ALTER COLUMN "estado" TYPE "cotizaciones_estado_enum"
        USING "estado"::text::"cotizaciones_estado_enum"
    `);

    // 5. Drop old enum
    await queryRunner.query(`DROP TYPE "cotizaciones_estado_enum_old"`);

    // 6. Migrate existing data to new values
    await queryRunner.query(`UPDATE "cotizaciones" SET "estado" = 'generado' WHERE "estado" = 'borrador'`);
    await queryRunner.query(`UPDATE "cotizaciones" SET "estado" = 'enviado'  WHERE "estado" = 'enviada'`);
    await queryRunner.query(`UPDATE "cotizaciones" SET "estado" = 'aceptado' WHERE "estado" = 'aprobada'`);
    await queryRunner.query(`UPDATE "cotizaciones" SET "estado" = 'perdido'  WHERE "estado" IN ('rechazada', 'cerrada')`);

    // 7. Set new default
    await queryRunner.query(`ALTER TABLE "cotizaciones" ALTER COLUMN "estado" SET DEFAULT 'generado'`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "cotizaciones" SET "estado" = 'borrador'  WHERE "estado" = 'generado'`);
    await queryRunner.query(`UPDATE "cotizaciones" SET "estado" = 'enviada'   WHERE "estado" = 'enviado'`);
    await queryRunner.query(`UPDATE "cotizaciones" SET "estado" = 'aprobada'  WHERE "estado" = 'aceptado'`);
    await queryRunner.query(`UPDATE "cotizaciones" SET "estado" = 'rechazada' WHERE "estado" = 'perdido'`);
    await queryRunner.query(`ALTER TABLE "cotizaciones" ALTER COLUMN "estado" SET DEFAULT 'borrador'`);
  }
}
