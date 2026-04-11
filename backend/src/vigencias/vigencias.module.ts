import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vigencia } from './vigencia.entity';
import { VigenciasController } from './vigencias.controller';
import { VigenciasService } from './vigencias.service';

@Module({
  imports: [TypeOrmModule.forFeature([Vigencia])],
  controllers: [VigenciasController],
  providers: [VigenciasService],
  exports: [VigenciasService],
})
export class VigenciasModule {}
