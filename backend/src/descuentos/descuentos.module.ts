import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistorialModule } from '../historial/historial.module';
import { DescuentoCondicion } from './descuento-condicion.entity';
import { DescuentoEvaluadorService } from './descuento-evaluador.service';
import { DescuentoRegla } from './descuento-regla.entity';
import { DescuentoVolumen } from './descuento-volumen.entity';
import { Descuento } from './descuento.entity';
import { DescuentosVolumenService } from './descuentos-volumen.service';
import {
  DescuentosController,
  DescuentosVolumenController,
} from './descuentos.controller';
import { DescuentosService } from './descuentos.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Descuento,
      DescuentoRegla,
      DescuentoCondicion,
      DescuentoVolumen,
    ]),
    HistorialModule,
  ],
  controllers: [DescuentosController, DescuentosVolumenController],
  providers: [DescuentosService, DescuentosVolumenService, DescuentoEvaluadorService],
  exports: [DescuentosService, DescuentosVolumenService, DescuentoEvaluadorService],
})
export class DescuentosModule {}
