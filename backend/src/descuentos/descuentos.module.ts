import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistorialModule } from '../historial/historial.module';
import { DescuentoVolumen } from './descuento-volumen.entity';
import { Descuento } from './descuento.entity';
import { DescuentosVolumenService } from './descuentos-volumen.service';
import {
  DescuentosController,
  DescuentosVolumenController,
} from './descuentos.controller';
import { DescuentosService } from './descuentos.service';

@Module({
  imports: [TypeOrmModule.forFeature([Descuento, DescuentoVolumen]), HistorialModule],
  controllers: [DescuentosController, DescuentosVolumenController],
  providers: [DescuentosService, DescuentosVolumenService],
  exports: [DescuentosService, DescuentosVolumenService],
})
export class DescuentosModule {}
