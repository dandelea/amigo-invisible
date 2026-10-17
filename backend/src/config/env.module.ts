import { Global, Inject, Module } from '@nestjs/common';
import { validateEnv } from './env.js';

export const ENV = Symbol('ENV');

// Inyecta la configuración validada con @InjectEnv().
export const InjectEnv = () => Inject(ENV);

// Valida process.env al crear la aplicación (no al importar el módulo), así
// cada test puede arrancar la app con su propia configuración.
@Global()
@Module({
  providers: [{ provide: ENV, useFactory: () => validateEnv(process.env) }],
  exports: [ENV],
})
export class EnvModule {}
