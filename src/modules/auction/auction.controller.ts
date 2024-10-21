import {
  BadRequestException,
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { AuctionService } from './auction.service'
import { AuthGuard } from '@nestjs/passport'
import { GetCurrentUserById } from 'utils/get-user-by-id.decorator'
import { Auction } from 'entities/auction.entity'
import { CreateAuctionDto } from './dto/create-auction.dto'
import { UpdateAuctionDto } from './dto/update-auction.dto'
import { CreateBidDto } from './dto/create-bid.dto'
import { Bid } from 'entities/bid.entity'
import { extname } from 'path'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { Notification } from 'entities/notification.entity'

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
    Logger.log('Returned all auctions')
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
  @Get('me/notifications')
  @HttpCode(HttpStatus.OK)
  async findUserNotifications(@GetCurrentUserById() userId: string): Promise<Notification[]> {
    const notificationsUser = await this.auctionService.findUserNotifications(userId)
    return notificationsUser
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('/me/notifications/:id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(@Param('id') id: string) {
    return this.auctionService.markAsRead(id)
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/auction')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createAuctionDto: CreateAuctionDto, @GetCurrentUserById() userId: string): Promise<Auction> {
    return this.auctionService.create(createAuctionDto, userId)
  }

  @Post('me/auction/upload/:id')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './files',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
          const ext = extname(file.originalname)
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`)
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
          Logger.log('Only image files ae allowed!')
          return cb(new BadRequestException('Only image files ae allowed!'), false)
        }
        cb(null, true)
      },
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async uploadImage(@UploadedFile() file: Express.Multer.File, @Param('id') auctionId: string): Promise<Auction> {
    Logger.log('Received file:', file)
    Logger.log('Auction ID:', auctionId)
    if (!file) throw new BadRequestException('File must be uploaded')
    const imageUrl = `/files/${file.filename}`
    return this.auctionService.updateAuctionImageUrl(auctionId, imageUrl)
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

  // This endpoint is only for testing
  @Post(':id/deactivate-test')
  @HttpCode(HttpStatus.OK)
  async deactivateTest(@Param('id') auctionId: string) {
    return await this.auctionService.deactivateAuction(auctionId)
  }
}
