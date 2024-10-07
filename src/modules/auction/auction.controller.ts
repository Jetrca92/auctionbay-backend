import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { AuctionService } from './auction.service'
import { AuthGuard } from '@nestjs/passport'
import { GetCurrentUserById } from 'utils/get-user-by-id.decorator'
import { Auction } from 'entities/auction.entity'
import { CreateAuctionDto } from './dto/create-auction.dto'
import { UpdateAuctionDto } from './dto/update-auction.dto'
import { CreateBidDto } from './dto/create-bid.dto'
import { Bid } from 'entities/bid.entity'

@Controller()
export class AuctionController {
  constructor(private readonly auctionService: AuctionService) {}

  @Get('active-auctions')
  @HttpCode(HttpStatus.OK)
  async findActiveuctions(): Promise<Auction[]> {
    const activeAuctions = await this.auctionService.findActiveAuctions()
    Logger.log('Returned active auctions')
    return activeAuctions
  }

  @Get('auctions')
  @HttpCode(HttpStatus.OK)
  async findAuctions(): Promise<Auction[]> {
    const auctions = await this.auctionService.findAuctions()
    Logger.log('Returned active auctions')
    return auctions
  }

  @Get('auction/:id')
  @HttpCode(HttpStatus.OK)
  async findAuction(@Param('id') auctionId: string): Promise<Auction> {
    const auction = await this.auctionService.findAuction(auctionId)
    Logger.log('Returned auction')
    return auction
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me/auctions')
  @HttpCode(HttpStatus.OK)
  async findUserAuctions(@GetCurrentUserById() userId: string): Promise<Auction[]> {
    const auctionsUser = await this.auctionService.findUserAuctions(userId)
    return auctionsUser
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/auction')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createAuctionDto: CreateAuctionDto, @GetCurrentUserById() userId: string): Promise<Auction> {
    return this.auctionService.create(createAuctionDto, userId)
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me/auction/:id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') auctionId: string,
    @GetCurrentUserById() userId: string,
    @Body() updateAuctionDto: UpdateAuctionDto,
  ): Promise<Auction> {
    return this.auctionService.update(auctionId, userId, updateAuctionDto)
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('me/auction/:id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') auctionId: string, @GetCurrentUserById() userId: string): Promise<Auction> {
    return this.auctionService.handleDelete(auctionId, userId)
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('auctions/:id/bid')
  @HttpCode(HttpStatus.OK)
  async bid(
    @Param('id') auctionId: string,
    @GetCurrentUserById() userId: string,
    @Body() createBidDto: CreateBidDto,
  ): Promise<Bid> {
    return this.auctionService.createBid(auctionId, userId, createBidDto)
  }
}
