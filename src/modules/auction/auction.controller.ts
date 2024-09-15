import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { AuctionService } from './auction.service'
import { AuthGuard } from '@nestjs/passport'
import { GetCurrentUserById } from 'utils/get-user-by-id.decorator'
import { Auction } from 'entities/auction.entity'
import { CreateAuctionDto } from './dto/create-auction.dto'

@Controller('me/auction')
export class AuctionController {
  constructor(private readonly auctionService: AuctionService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  @HttpCode(HttpStatus.OK)
  async create(@Body() createAuctionDto: CreateAuctionDto, @GetCurrentUserById() userId: string): Promise<Auction> {
    return this.auctionService.create(createAuctionDto, userId)
  }
}
