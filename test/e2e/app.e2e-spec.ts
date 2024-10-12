import { Test, TestingModule } from '@nestjs/testing'
import { AppModule } from 'modules/app.module'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import * as pactum from 'pactum'
import { DataSource } from 'typeorm'
import { SignupDto } from 'modules/auth/dto'
import { ServeStaticModule } from '@nestjs/serve-static'
import { join } from 'path'
import { ConfigModule } from '@nestjs/config'
import { configValidationSchema } from 'config/schema.config'
import { DatabaseModule } from 'modules/database/database.module'
import { UserModule } from 'modules/user/user.module'
import { AuthModule } from 'modules/auth/auth.module'
import { AuctionModule } from 'modules/auction/auction.module'

describe('App E2E', () => {
  let app: INestApplication
  let dataSource: DataSource

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule,
        ServeStaticModule.forRoot({
          rootPath: join(__dirname, '..', '..', 'files'),
          serveRoot: '/files',
        }),
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: [`.env.${process.env.STAGE}`],
          validationSchema: configValidationSchema,
        }),
        DatabaseModule,
        UserModule,
        AuthModule,
        AuctionModule,
      ],
    }).compile()
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )

    app = moduleFixture.createNestApplication()
    await app.init()
    dataSource = app.get<DataSource>(DataSource)
  })

  afterAll(async () => {
    await dataSource.destroy()
    await app.close()
  })

  describe('Auth', () => {
    describe('Login', () => {})

    describe('Signup', () => {
      it('should signUp', () => {
        const dto: SignupDto = {
          first_name: '123',
          last_name: '456',
          email: 'test@email.com',
          password: 'Podzemlje42',
          confirm_password: 'Podzemlje42',
        }
        return pactum.spec().post('http://localhost:3333/auth/signup').withBody(dto).expectStatus(201)
      })
    })
  })
})
