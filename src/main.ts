import { NestFactory } from '@nestjs/core'
import { AppModule } from './modules/app.module'
import { Logger, ValidationPipe } from '@nestjs/common'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
    allowedHeaders: 'Authorization, Content-Type',
  })
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  const PORT = process.env.PORT || 8080
  await app.listen(PORT)

  Logger.log(`App is listening on http://localhost:${PORT}`)
}
bootstrap()
