import { Test, TestingModule } from '@nestjs/testing'
import { AppModule } from 'modules/app.module'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import * as pactum from 'pactum'
import { DataSource } from 'typeorm'
import { LoginDto, SignupDto } from 'modules/auth/dto'
import { ServeStaticModule } from '@nestjs/serve-static'
import { join } from 'path'
import { ConfigModule } from '@nestjs/config'
import { configValidationSchema } from 'config/schema.config'
import { DatabaseModule } from 'modules/database/database.module'
import { UserModule } from 'modules/user/user.module'
import { AuthModule } from 'modules/auth/auth.module'
import { AuctionModule } from 'modules/auction/auction.module'
import { CreateAuctionDto } from 'modules/auction/dto/create-auction.dto'
import { UpdateUserDto } from 'modules/user/dto/update-user.dto'

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

    // Initialize the app
    app = moduleFixture.createNestApplication()

    // Use global pipes
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )

    await app.init()
    await app.listen(3333)
    // Assign the dataSource after initializing the app
    dataSource = app.get<DataSource>(DataSource)
    await dataSource.query(`DELETE FROM "user";`)
    pactum.request.setBaseUrl('http://localhost:3333')
  })

  afterAll(async () => {
    dataSource.destroy()
    await app.close()
  })

  beforeEach(async () => {
    await dataSource.query(`DELETE FROM "user";`)
  })

  describe('Auth', () => {
    describe('Login', () => {
      const dto: LoginDto = {
        email: 'john@example.com',
        password: 'Test12345',
      }
      beforeEach(async () => {
        const userDto = {
          first_name: 'John',
          last_name: 'Doe',
          email: dto.email,
          password: dto.password,
          confirm_password: dto.password,
        }
        await pactum.spec().post('/auth/signup').withBody(userDto).expectStatus(201)
      })

      it('should throw an exception if email is invalid', () => {
        return pactum
          .spec()
          .post('/auth/login')
          .withBody({
            email: 'invalid@example.com',
            password: dto.password,
          })
          .expectStatus(401)
          .expectBodyContains('Invalid credentials')
      })

      it('should throw an exception if password is incorrect', () => {
        return pactum
          .spec()
          .post('/auth/login')
          .withBody({
            email: dto.email,
            password: 'WrongPassword123',
          })
          .expectStatus(401)
          .expectBodyContains('Invalid credentials')
      })

      it('should throw an exception if no body is provided', () => {
        return pactum.spec().post('/auth/login').expectStatus(400)
      })

      it('should throw an exception if password is not provided', () => {
        return pactum.spec().post('/auth/login').withBody({ email: dto.email }).expectStatus(400)
      })

      it('should throw an exception if email is not provided', () => {
        return pactum.spec().post('/auth/login').withBody({ password: dto.password }).expectStatus(400)
      })

      it('should login successfully with valid credentials', async () => {
        const loginResponse = await pactum.spec().post('/auth/login').withBody(dto).expectStatus(200)
        const token = loginResponse.body
        await pactum
          .spec()
          .get('/me')
          .withHeaders({
            Authorization: `Bearer ${token}`,
          })
          .expectStatus(200)
      })
    })

    describe('Signup', () => {
      it('should throw exception if email empty', () => {
        const dto: SignupDto = {
          first_name: '123',
          last_name: '456',
          email: 'test@email.com',
          password: 'testPw42',
          confirm_password: 'testPw42',
        }
        return pactum.spec().post('/auth/signup').withBody(dto.first_name).expectStatus(400)
      })

      it('should throw an exception if password is weak', () => {
        const dto: SignupDto = {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          password: 'test',
          confirm_password: 'test',
        }
        return pactum.spec().post('/auth/signup').withBody(dto).expectStatus(400)
      })

      it('should throw an exception if passwords do not match', () => {
        const dto: SignupDto = {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          password: 'Test12345',
          confirm_password: 'DifferentPassword',
        }
        return pactum.spec().post('/auth/signup').withBody(dto).expectStatus(400)
      })

      it('should throw exception if no body', () => {
        return pactum.spec().post('/auth/signup').expectStatus(400)
      })

      it('should throw an exception if email already exists', async () => {
        const dto: SignupDto = {
          first_name: 'John',
          last_name: 'Doe',
          email: 'existinguser@example.com',
          password: 'Test12345',
          confirm_password: 'Test12345',
        }
        await pactum.spec().post('/auth/signup').withBody(dto).expectStatus(201)
        return pactum.spec().post('/auth/signup').withBody(dto).expectStatus(400)
      })

      it('should signup successfully with valid data', () => {
        const dto: SignupDto = {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          password: 'Test12345',
          confirm_password: 'Test12345',
        }
        return pactum.spec().post('/auth/signup').withBody(dto).expectStatus(201)
      })
    })
  })

  describe('User', () => {
    let mockOwner: SignupDto
    let updateMockOwner: UpdateUserDto
    let token: string
    beforeEach(async () => {
      mockOwner = {
        email: 'owner@example.com',
        password: 'OwnerPass123',
        confirm_password: 'OwnerPass123',
        first_name: 'John',
        last_name: 'Doe',
      }
      updateMockOwner = {
        password: 'OwnerPass321',
      }
      await pactum.spec().post('/auth/signup').withBody(mockOwner).expectStatus(201)
      const loginResponse = await pactum
        .spec()
        .post('/auth/login')
        .withBody({ email: mockOwner.email, password: mockOwner.password })
        .expectStatus(200)
      token = loginResponse.body
    })
    describe('Fetch user', () => {
      it('should return user', async () => {
        await pactum
          .spec()
          .get('/me')
          .withHeaders({
            Authorization: `Bearer ${token}`,
          })
          .expectStatus(200)
      })

      it('should return 401 if token is missing', async () => {
        await pactum
          .spec()
          .get('/me')
          .withHeaders({
            Authorization: `Bearer `,
          })
          .expectStatus(401)
      })

      it('should return 401 unauthorized if bad token', async () => {
        await pactum
          .spec()
          .get('/me')
          .withHeaders({
            Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c`,
          })
          .expectStatus(401)
      })
    })

    describe('Update password', () => {
      it('should update password', async () => {
        await pactum
          .spec()
          .patch('/me/update-password')
          .withHeaders({
            Authorization: `Bearer ${token}`,
          })
          .withBody(updateMockOwner)
          .expectStatus(200)
      })

      it('should return BadRequest if same pw', async () => {
        await pactum
          .spec()
          .patch('/me/update-password')
          .withHeaders({
            Authorization: `Bearer ${token}`,
          })
          .withBody({
            password: mockOwner.password,
            confirm_password: mockOwner.confirm_password,
          })
          .expectStatus(400)
      })

      it('should return Unauthorized if no token is provided', async () => {
        await pactum
          .spec()
          .patch('/me/update-password')
          .withBody({
            updateMockOwner,
          })
          .expectStatus(401)
      })

      it('should return BadRequest when fields are missing', async () => {
        await pactum
          .spec()
          .patch('/me/update-password')
          .withHeaders({ Authorization: `Bearer ${token}` })
          .withBody({})
          .expectStatus(400)
      })
    })
  })

  describe('Auction', () => {
    let mockOwner: SignupDto
    let token: string
    beforeEach(async () => {
      // Insert a mock user to be used as the auction owner
      mockOwner = {
        email: 'owner@example.com',
        password: 'OwnerPass123',
        confirm_password: 'OwnerPass123',
        first_name: 'John',
        last_name: 'Doe',
      }
      await pactum.spec().post('/auth/signup').withBody(mockOwner).expectStatus(201)
      const loginResponse = await pactum
        .spec()
        .post('/auth/login')
        .withBody({ email: mockOwner.email, password: mockOwner.password })
        .expectStatus(200)
      token = loginResponse.body
    })

    describe('Create auction', () => {
      const createAuctionDto: CreateAuctionDto = {
        title: 'test auction',
        description: 'This is a test auction',
        starting_price: 1,
        end_date: '2025-12-17T03:24:00',
        is_active: true,
      }
      it('should create a new auction', async () => {
        const userResponse = await pactum
          .spec()
          .get('/me')
          .withHeaders({
            Authorization: `Bearer ${token}`,
          })
          .expectStatus(200)

        await pactum
          .spec()
          .post('/me/auction/')
          .withHeaders({
            Authorization: `Bearer ${token}`,
          })
          .withBody(createAuctionDto)
          .expectStatus(201)
      })
    })
  })
})
