import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MensajeImagen } from './mensaje-imagen.entity';
import { Mensaje } from './mensaje.entity';
import { MensajesController } from './mensajes.controller';
import { MensajesService } from './mensajes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Mensaje, MensajeImagen])],
  controllers: [MensajesController],
  providers: [MensajesService],
})
export class MensajesModule {}
