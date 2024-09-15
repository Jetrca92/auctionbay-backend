import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { configValidationSchema } from '../config/schema.config'

import { DatabaseModule } from './database/database.module'
import { UserModule } from './user/user.module'
import { AuthModule } from './auth/auth.module'
import { AuctionModule } from './auction/auction.module'

@Module({
  imports: [
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
  controllers: [],
  providers: [],
})
export class AppModule {}
