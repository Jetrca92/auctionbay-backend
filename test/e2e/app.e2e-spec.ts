import { Test } from '@nestjs/testing'
import * as pactum from 'pactum'
import { INestApplication, ValidationPipe } from '@nestjs/common'

import { AppModule } from '../../src/modules/app.module'
import { ServeStaticModule } from '@nestjs/serve-static'
import { ConfigModule } from '@nestjs/config'
import { configValidationSchema } from 'config/schema.config'
import { DatabaseModule } from 'modules/database/database.module'
import { UserModule } from 'modules/user/user.module'
import { AuthModule } from 'modules/auth/auth.module'
import { AuctionModule } from 'modules/auction/auction.module'
import { join } from 'path'
import { DataSource } from 'typeorm'
import { getDataSourceToken } from '@nestjs/typeorm'

describe('App e2e', () => {
  // start
  let app: INestApplication
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
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
    app = moduleRef.createNestApplication()
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
      }),
    )
    try {
      await app.init()
    } catch (error) {
      console.error('Error initializing the app:', error)
    }
  }, 30000)

  // teardown
  afterAll(async () => {
    if (app) {
      await app.close()

      try {
        const dataSource: DataSource = await app.get(getDataSourceToken())

        if (!dataSource.isInitialized) {
          await dataSource.initialize()
        }

        await dataSource.dropDatabase()
        await dataSource.destroy()
      } catch (error) {
        console.error('Error during database teardown:', error)
      }
    }
  })

  describe('Auth', () => {
    describe('Login', () => {})

    describe('Signup', () => {})
  })

  describe('Auction', () => {
    describe('Get active auctions', () => {})
    describe('Get all auctions', () => {})
    describe('Get active auctions', () => {})
    describe('Get auction by id', () => {})
    describe('Get user auctions', () => {})
    describe('Create auction', () => {})
    describe('Upload image to auction', () => {})
    describe('Edit auction', () => {})
    describe('Delete auction', () => {})
    describe('Create bid for auction', () => {})
  })

  describe('User', () => {})
})
