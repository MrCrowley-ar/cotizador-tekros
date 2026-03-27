import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistorialModule } from '../historial/historial.module';
import { Precio } from './precio.entity';
import { PreciosController } from './precios.controller';
import { PreciosService } from './precios.service';

@Module({
  imports: [TypeOrmModule.forFeature([Precio]), HistorialModule],
  controllers: [PreciosController],
  providers: [PreciosService],
  exports: [PreciosService],
})
export class PreciosModule {}
