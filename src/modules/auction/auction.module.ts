import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Auction } from 'entities/auction.entity'
import { AuctionController } from './auction.controller'
import { AuctionService } from './auction.service'
import { User } from 'entities/user.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Auction, User])],
  controllers: [AuctionController],
  providers: [AuctionService],
  exports: [AuctionService],
})
export class AuctionModule {}
