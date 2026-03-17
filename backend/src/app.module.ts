import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientesModule } from './clientes/clientes.module';
import { CotizacionesModule } from './cotizaciones/cotizaciones.module';
import { DatabaseModule } from './database/database.module';
import { DescuentosModule } from './descuentos/descuentos.module';
import { HistorialModule } from './historial/historial.module';
import { MensajesModule } from './mensajes/mensajes.module';
import { PreciosModule } from './precios/precios.module';
import { ProductosModule } from './productos/productos.module';
import { UsuariosModule } from './usuarios/usuarios.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    UsuariosModule,
    ClientesModule,
    ProductosModule,
    PreciosModule,
    DescuentosModule,
    CotizacionesModule,
    HistorialModule,
    MensajesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
