import { NestFactory } from '@nestjs/core'
import { AppModule } from './modules/app.module'
import { Logger, ValidationPipe } from '@nestjs/common'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
  })
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips properties that don't have decorators in the DTO
      forbidNonWhitelisted: true, // Throws an error if a non-whitelisted property is present
      transform: true, // Automatically transforms payloads to be objects typed according to DTOs
    }),
  )
  const PORT = process.env.PORT || 8080
  await app.listen(PORT)

  Logger.log(`App is listening on http://localhost:${PORT}`)
}
bootstrap()
