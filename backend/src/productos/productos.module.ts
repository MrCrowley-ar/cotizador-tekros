import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BandasService } from './bandas.service';
import { Banda } from './banda.entity';
import { Cultivo } from './cultivo.entity';
import { CultivosService } from './cultivos.service';
import { Hibrido } from './hibrido.entity';
import { HibridosService } from './hibridos.service';
import { BandasController, CultivosController, HibridosController } from './productos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Cultivo, Hibrido, Banda])],
  controllers: [CultivosController, HibridosController, BandasController],
  providers: [CultivosService, HibridosService, BandasService],
  exports: [CultivosService, HibridosService, BandasService],
})
export class ProductosModule {}
