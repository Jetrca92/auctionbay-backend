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
import { v4 as uuidv4 } from 'uuid'
import { CreateBidDto } from 'modules/auction/dto/create-bid.dto'

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
        await pactum
          .spec()
          .post('/me/auction/')
          .withHeaders({
            Authorization: `Bearer ${token}`,
          })
          .withBody(createAuctionDto)
          .expectStatus(201)
      })

      it('should throw an error when user ID is missing', async () => {
        await pactum.spec().post('/me/auction').withBody(createAuctionDto).expectStatus(401)
      })

      it('should throw an error when auction details are missing', async () => {
        await pactum
          .spec()
          .post('/me/auction')
          .withHeaders({ Authorization: `Bearer ${token}` })
          .withBody({})
          .expectStatus(400)
      })
    })

    describe('Update auction', () => {
      const updateAuctionDto = {
        title: 'Updated title',
      }
      const createAuctionDto: CreateAuctionDto = {
        title: 'test auction',
        description: 'This is a test auction',
        starting_price: 1,
        end_date: '2025-12-17T03:24:00',
        is_active: true,
      }
      let auctionId: string
      beforeEach(async () => {
        const auction = await pactum
          .spec()
          .post('/me/auction/')
          .withHeaders({
            Authorization: `Bearer ${token}`,
          })
          .withBody(createAuctionDto)
          .expectStatus(201)
        auctionId = auction.body.id
      })

      it('should update an auction', async () => {
        await pactum
          .spec()
          .patch(`/me/auction/${auctionId}`)
          .withHeaders({ Authorization: `Bearer ${token}` }) // Assuming token is valid
          .withBody(updateAuctionDto)
          .expectStatus(200)
      })

      it('should throw a BadRequestException when auction ID is missing', async () => {
        await pactum
          .spec()
          .patch('/me/auction/')
          .withHeaders({ Authorization: `Bearer ${token}` })
          .withBody(updateAuctionDto)
          .expectStatus(404)
      })

      it('should throw an UnauthorizedException when user ID is missing', async () => {
        await pactum.spec().patch(`/me/auction/${auctionId}`).withBody(updateAuctionDto).expectStatus(401)
      })

      it('should throw a NotFoundException if auction does not exist', async () => {
        const nonExistingId = uuidv4()
        await pactum
          .spec()
          .patch(`/me/auction/${nonExistingId}`)
          .withHeaders({ Authorization: `Bearer ${token}` })
          .withBody(updateAuctionDto)
          .expectStatus(404)
      })

      it('should throw a ForbiddenException if user is not the auction owner', async () => {
        const mockOwner2 = {
          email: 'owner2@example.com',
          password: 'Owner2Pass123',
          confirm_password: 'Owner2Pass123',
          first_name: 'Harry',
          last_name: 'Potter',
        }
        await pactum.spec().post('/auth/signup').withBody(mockOwner2).expectStatus(201)
        const loginResponse = await pactum
          .spec()
          .post('/auth/login')
          .withBody({ email: mockOwner2.email, password: mockOwner2.password })
          .expectStatus(200)
        const token2 = loginResponse.body
        const auction2 = await pactum
          .spec()
          .post('/me/auction/')
          .withHeaders({
            Authorization: `Bearer ${token2}`,
          })
          .withBody(createAuctionDto)
          .expectStatus(201)
        const auction2Id = auction2.body.id
        await pactum
          .spec()
          .patch(`/me/auction/${auction2Id}`)
          .withHeaders({ Authorization: `Bearer ${token}` })
          .withBody(updateAuctionDto)
          .expectStatus(403)
      })
    })

    describe('Get active auctions', () => {
      it('should return active auctions', async () => {
        const createAuctionDto: CreateAuctionDto = {
          title: 'test auction',
          description: 'This is a test auction',
          starting_price: 1,
          end_date: '2025-12-17T03:24:00',
          is_active: true,
        }
        const createAuctionDto2: CreateAuctionDto = {
          title: 'test auction2',
          description: 'This is a test auction2',
          starting_price: 2,
          end_date: '2025-12-19T03:24:00',
          is_active: true,
        }
        const createAuctionDto3: CreateAuctionDto = {
          title: 'test auction3',
          description: 'This is a test auction3',
          starting_price: 3,
          end_date: '2025-12-19T03:24:00',
          is_active: false,
        }
        await pactum
          .spec()
          .post('/me/auction/')
          .withHeaders({
            Authorization: `Bearer ${token}`,
          })
          .withBody(createAuctionDto)
          .expectStatus(201)
        await pactum
          .spec()
          .post('/me/auction/')
          .withHeaders({
            Authorization: `Bearer ${token}`,
          })
          .withBody(createAuctionDto2)
          .expectStatus(201)
        await pactum
          .spec()
          .post('/me/auction/')
          .withHeaders({
            Authorization: `Bearer ${token}`,
          })
          .withBody(createAuctionDto3)
          .expectStatus(201)
        const response = await pactum.spec().get('/active-auctions').expectStatus(200)
        expect(response.body).toHaveLength(2)
      })

      it('should return an empty array when no active auctions are found', async () => {
        const response = await pactum.spec().get('/active-auctions').expectStatus(200)
        expect(response.body).toHaveLength(0)
      })
    })

    describe('Get auctions', () => {
      it('should return all auctions', async () => {
        const createAuctionDto: CreateAuctionDto = {
          title: 'test auction',
          description: 'This is a test auction',
          starting_price: 1,
          end_date: '2025-12-17T03:24:00',
          is_active: true,
        }
        const createAuctionDto2: CreateAuctionDto = {
          title: 'test auction2',
          description: 'This is a test auction2',
          starting_price: 2,
          end_date: '2025-12-19T03:24:00',
          is_active: true,
        }
        const createAuctionDto3: CreateAuctionDto = {
          title: 'test auction3',
          description: 'This is a test auction3',
          starting_price: 3,
          end_date: '2025-12-19T03:24:00',
          is_active: false,
        }
        await pactum
          .spec()
          .post('/me/auction/')
          .withHeaders({
            Authorization: `Bearer ${token}`,
          })
          .withBody(createAuctionDto)
          .expectStatus(201)
        await pactum
          .spec()
          .post('/me/auction/')
          .withHeaders({
            Authorization: `Bearer ${token}`,
          })
          .withBody(createAuctionDto2)
          .expectStatus(201)
        await pactum
          .spec()
          .post('/me/auction/')
          .withHeaders({
            Authorization: `Bearer ${token}`,
          })
          .withBody(createAuctionDto3)
          .expectStatus(201)
        const response = await pactum.spec().get('/auctions').expectStatus(200)
        expect(response.body).toHaveLength(3)
      })

      it('should return an empty array when no auctions are found', async () => {
        const response = await pactum.spec().get('/auctions').expectStatus(200)
        expect(response.body).toHaveLength(0)
      })
    })

    describe('Get user auctions', () => {
      it('should return user auctions', async () => {
        const createAuctionDto: CreateAuctionDto = {
          title: 'test auction',
          description: 'This is a test auction',
          starting_price: 1,
          end_date: '2025-12-17T03:24:00',
          is_active: true,
        }
        const createAuctionDto2: CreateAuctionDto = {
          title: 'test auction2',
          description: 'This is a test auction2',
          starting_price: 2,
          end_date: '2025-12-19T03:24:00',
          is_active: true,
        }
        const createAuctionDto3: CreateAuctionDto = {
          title: 'test auction3',
          description: 'This is a test auction3',
          starting_price: 3,
          end_date: '2025-12-19T03:24:00',
          is_active: false,
        }
        const mockOwner2 = {
          email: 'owner2@example.com',
          password: 'Owner2Pass123',
          confirm_password: 'Owner2Pass123',
          first_name: 'Harry',
          last_name: 'Potter',
        }
        await pactum.spec().post('/auth/signup').withBody(mockOwner2).expectStatus(201)
        const loginResponse = await pactum
          .spec()
          .post('/auth/login')
          .withBody({ email: mockOwner2.email, password: mockOwner2.password })
          .expectStatus(200)
        const token2 = loginResponse.body
        await pactum
          .spec()
          .post('/me/auction/')
          .withHeaders({
            Authorization: `Bearer ${token}`,
          })
          .withBody(createAuctionDto)
          .expectStatus(201)
        await pactum
          .spec()
          .post('/me/auction/')
          .withHeaders({
            Authorization: `Bearer ${token}`,
          })
          .withBody(createAuctionDto2)
          .expectStatus(201)
        await pactum
          .spec()
          .post('/me/auction/')
          .withHeaders({
            Authorization: `Bearer ${token2}`,
          })
          .withBody(createAuctionDto3)
          .expectStatus(201)
        const response = await pactum
          .spec()
          .get('/me/auctions')
          .withHeaders({
            Authorization: `Bearer ${token}`,
          })
          .expectStatus(200)
        expect(response.body).toHaveLength(2)
      })

      it('should return empty if no user auctions', async () => {
        const response = await pactum
          .spec()
          .get('/me/auctions')
          .withHeaders({
            Authorization: `Bearer ${token}`,
          })
          .expectStatus(200)
        expect(response.body).toHaveLength(0)
      })
    })

    describe('Get auction by ID', () => {
      let auctionId: string
      beforeEach(async () => {
        const createAuctionDto: CreateAuctionDto = {
          title: 'test auction',
          description: 'This is a test auction',
          starting_price: 1,
          end_date: '2025-12-17T03:24:00',
          is_active: true,
        }
        const response = await pactum
          .spec()
          .post('/me/auction/')
          .withHeaders({
            Authorization: `Bearer ${token}`,
          })
          .withBody(createAuctionDto)
          .expectStatus(201)
        auctionId = response.body.id
      })
      it('should return an auction by ID', async () => {
        const response = await pactum.spec().get(`/auction/${auctionId}`).expectStatus(200)
        expect(response.body).toHaveProperty('id', auctionId)
      })

      it('should return not found for non existent ID', async () => {
        const nonExistentId = uuidv4()
        await pactum.spec().get(`/auction/${nonExistentId}`).expectStatus(404)
      })
    })

    describe('Upload image to auction', () => {
      let auctionId: string
      beforeEach(async () => {
        const createAuctionDto: CreateAuctionDto = {
          title: 'test auction',
          description: 'This is a test auction',
          starting_price: 1,
          end_date: '2025-12-17T03:24:00',
          is_active: true,
        }
        const response = await pactum
          .spec()
          .post('/me/auction/')
          .withHeaders({
            Authorization: `Bearer ${token}`,
          })
          .withBody(createAuctionDto)
          .expectStatus(201)
        auctionId = response.body.id
      })

      it('should upload an image and return the updated auction', async () => {
        const response = await pactum
          .spec()
          .post(`/me/auction/upload/${auctionId}`)
          .withHeaders({
            Authorization: `Bearer ${token}`,
          })
          .withFile('image', 'tsconfig.png')
          .expectStatus(201)
        expect(response.body).toHaveProperty('image')
        console.log(response.body)
      })
    })

    describe('Bid an auction', () => {
      let auctionId: string
      let token2: string
      const bidAmount: CreateBidDto = { amount: 150 }
      const createAuctionDto: CreateAuctionDto = {
        title: 'test auction',
        description: 'This is a test auction',
        starting_price: 10,
        end_date: '2025-12-17T03:24:00',
        is_active: true,
      }

      beforeEach(async () => {
        const mockOwner2 = {
          email: 'owner2@example.com',
          password: 'Owner2Pass123',
          confirm_password: 'Owner2Pass123',
          first_name: 'Harry',
          last_name: 'Potter',
        }
        await pactum.spec().post('/auth/signup').withBody(mockOwner2).expectStatus(201)
        const loginResponse = await pactum
          .spec()
          .post('/auth/login')
          .withBody({ email: mockOwner2.email, password: mockOwner2.password })
          .expectStatus(200)
        token2 = loginResponse.body
        const response = await pactum
          .spec()
          .post('/me/auction/')
          .withHeaders({
            Authorization: `Bearer ${token}`,
          })
          .withBody(createAuctionDto)
          .expectStatus(201)
        auctionId = response.body.id
      })
      it('should return 400, not possible to bid your auction', async () => {
        await pactum
          .spec()
          .post(`/auctions/${auctionId}/bid`)
          .withHeaders({
            Authorization: `Bearer ${token}`,
          })
          .withBody(bidAmount)
          .expectStatus(400)
      })

      it('should create bid', async () => {
        await pactum
          .spec()
          .post(`/auctions/${auctionId}/bid`)
          .withHeaders({
            Authorization: `Bearer ${token2}`,
          })
          .withBody(bidAmount)
          .expectStatus(200)
      })

      it('should return 400 if the bid is lower than the auction price', async () => {
        const lowerBidAmount: CreateBidDto = { amount: 9 } // Lower than the auction price
        await pactum
          .spec()
          .post(`/auctions/${auctionId}/bid`)
          .withHeaders({
            Authorization: `Bearer ${token2}`,
          })
          .withBody(lowerBidAmount)
          .expectStatus(400)
      })
    })
  })
})
