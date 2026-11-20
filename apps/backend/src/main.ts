import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') || 4000;
  const apiPrefix = configService.get<string>('app.apiPrefix') || 'api';

  // Global API route prefix
  app.setGlobalPrefix(apiPrefix);

  // Prevent browser caching on all API endpoints (anti-bfcache, logout protection)
  app.use((_req: any, res: any, next: any) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  // Cookie parser middleware for HttpOnly JWT session tokens
  app.use(cookieParser());

  // CORS configuration for local development and production Vercel frontend
  const frontendUrlEnv = process.env.FRONTEND_URL;
  const configuredOrigins = frontendUrlEnv
    ? frontendUrlEnv.split(',').map((u) => u.trim().replace(/\/+$/, ''))
    : [];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, health checks, curl)
      if (!origin) {
        return callback(null, true);
      }

      // Allow explicitly configured FRONTEND_URL(s)
      if (configuredOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow all Vercel production and preview deployments
      if (/^https:\/\/.*\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }

      // Allow local development and testing origins
      if (
        /^http:\/\/localhost:(5173|3000|4000)$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1:(5173|3000|4000)$/.test(origin)
      ) {
        return callback(null, true);
      }

      // In non-production environments, allow origin
      if (configService.get<string>('app.nodeEnv') !== 'production') {
        return callback(null, true);
      }

      callback(new Error(`CORS error: Origin ${origin} not permitted`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Global request validation pipeline
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter and request logging interceptor
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  await app.listen(port);
  logger.log(`====================================================`);
  logger.log(`IGNITRON 2K26 Backend Server running`);
  logger.log(`Environment: ${configService.get<string>('app.nodeEnv')}`);
  logger.log(`Base URL:    http://localhost:${port}/${apiPrefix}`);
  logger.log(`Health API:  http://localhost:${port}/${apiPrefix}/health`);
  logger.log(`====================================================`);
}

bootstrap().catch((err) => {
  console.error('Fatal error during backend bootstrapping:', err);
  process.exit(1);
});

