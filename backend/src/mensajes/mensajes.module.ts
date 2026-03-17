import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistorialModule } from '../historial/historial.module';
import { MensajeImagen } from './mensaje-imagen.entity';
import { Mensaje } from './mensaje.entity';
import { MensajesController } from './mensajes.controller';
import { MensajesService } from './mensajes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Mensaje, MensajeImagen]), HistorialModule],
  controllers: [MensajesController],
  providers: [MensajesService],
})
export class MensajesModule {}
