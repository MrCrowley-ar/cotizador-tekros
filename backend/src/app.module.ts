import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
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
    AuthModule,
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
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
