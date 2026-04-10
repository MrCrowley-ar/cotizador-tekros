import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DescuentosModule } from '../descuentos/descuentos.module';
import { HistorialModule } from '../historial/historial.module';
import { PreciosModule } from '../precios/precios.module';
import { CotizacionDescuento } from './cotizacion-descuento.entity';
import { CotizacionItemDescuento } from './cotizacion-item-descuento.entity';
import { CotizacionItem } from './cotizacion-item.entity';
import { CotizacionVersion } from './cotizacion-version.entity';
import { CotizacionVersionCultivo } from './cotizacion-version-cultivo.entity';
import { CotizacionVersionSeccion } from './cotizacion-version-seccion.entity';
import { Cotizacion } from './cotizacion.entity';
import { CotizacionesController } from './cotizaciones.controller';
import { CotizacionesService } from './cotizaciones.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cotizacion,
      CotizacionVersion,
      CotizacionVersionSeccion,
      CotizacionVersionCultivo,
      CotizacionItem,
      CotizacionItemDescuento,
      CotizacionDescuento,
    ]),
    PreciosModule,
    DescuentosModule,
    HistorialModule,
  ],
  controllers: [CotizacionesController],
  providers: [CotizacionesService],
  exports: [CotizacionesService],
})
export class CotizacionesModule {}
