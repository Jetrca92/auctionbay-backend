import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Auction } from 'entities/auction.entity'
import { AbstractService } from 'modules/common/abstract.service'
import { CreateAuctionDto } from 'modules/auction/dto/create-auction.dto'
import { Repository } from 'typeorm'
import { User } from 'entities/user.entity'
import { UpdateAuctionDto } from './dto/update-auction.dto'
import { CreateBidDto } from './dto/create-bid.dto'
import { Bid } from 'entities/bid.entity'
import { Notification } from 'entities/notification.entity'

@Injectable()
export class AuctionService extends AbstractService {
  constructor(
    @InjectRepository(Auction) private readonly auctionRepository: Repository<Auction>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Bid) private readonly bidRepository: Repository<Bid>,
    @InjectRepository(Notification) private readonly notificationRepository: Repository<Notification>,
  ) {
    super(auctionRepository)
  }

  async create(createAuctionDto: CreateAuctionDto, userId: string): Promise<Auction> {
    if (!userId) throw new BadRequestException('User ID must be provided')
    if (!createAuctionDto) throw new BadRequestException('Auction details must be provided')
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } })
      if (!user) {
        throw new NotFoundException('User not found')
      }
      const newAuction = this.auctionRepository.create({ ...createAuctionDto, owner: user })
      Logger.log(`Creating new auction ${newAuction.title} by ${userId} user id.`)
      return this.auctionRepository.save(newAuction)
    } catch (error) {
      Logger.error(error)
      throw new InternalServerErrorException('Something went wrong while creating a new auction.')
    }
  }

  async update(auctionId: string, userId: string, updateAuctionDto: UpdateAuctionDto): Promise<Auction> {
    if (!auctionId || !userId) throw new BadRequestException('Auction and User ID must be provided')
    try {
      const auction = (await this.auctionRepository.findOne({
        where: { id: auctionId },
        relations: ['owner'],
      })) as Auction
      if (!auction) throw new NotFoundException(`Auction with ID ${auctionId} not found`)
      if (auction.owner.id !== userId) throw new ForbiddenException('You are not the owner of this auction')
      Object.assign(auction, updateAuctionDto)
      Logger.log(`Updating auction ID: ${auctionId} by user ID: ${userId}.`)
      return await this.auctionRepository.save(auction)
    } catch (error) {
      if (error instanceof NotFoundException || ForbiddenException) throw error
      Logger.error(error)
      throw new InternalServerErrorException('Something went wrong while updating the auction.')
    }
  }

  async handleDelete(auctionId: string, userId: string): Promise<Auction> {
    if (!auctionId || !userId) throw new BadRequestException('Auction and User ID must be provided')
    const auction = (await this.auctionRepository.findOne({
      where: { id: auctionId },
      relations: ['owner'],
    })) as Auction
    if (!auction) throw new NotFoundException(`Auction with ID ${auctionId} not found`)
    if (auction.owner.id !== userId) throw new ForbiddenException('You are notthe owner of this auction')
    return this.remove(auctionId)
  }

  private async checkActiveAuctions(): Promise<void> {
    Logger.log('Checking active auctions')
    try {
      const auctions = (await this.auctionRepository.find({
        where: { is_active: true },
        relations: ['bids', 'bids.owner', 'owner'],
      })) as Auction[]

      for (const auction of auctions) {
        const statusUpdated = auction.checkAndUpdateAuctionStatus()
        Logger.log(statusUpdated)
        if (statusUpdated) {
          await this.auctionRepository.save(auction)
          await this.createNotifications(auction.id)
        }
      }
    } catch (error) {
      throw new InternalServerErrorException(error)
    }
  }

  async findAuctions(): Promise<Auction[]> {
    this.checkActiveAuctions()
    try {
      const auctions = await this.auctionRepository.find({
        order: { end_date: 'ASC' },
        relations: ['owner', 'bids', 'bids.owner'],
      })
      return auctions
    } catch (error) {
      throw new InternalServerErrorException(error)
    }
  }

  async findAuction(id: string): Promise<Auction> {
    if (!id) throw new BadRequestException('Auction ID must be provided.')
    try {
      const auction = await this.auctionRepository.findOne({
        where: { id: id },
        relations: ['owner', 'bids', 'bids.owner'],
      })
      if (!auction) throw new NotFoundException()
      return auction
    } catch (error) {
      if (error instanceof NotFoundException) throw error
      throw new InternalServerErrorException(error)
    }
  }

  async findActiveAuctions(): Promise<Auction[]> {
    this.checkActiveAuctions()
    try {
      const activeAuctions = await this.auctionRepository.find({
        where: { is_active: true },
        order: { end_date: 'ASC' },
        relations: ['owner', 'bids', 'bids.owner'],
      })
      return activeAuctions
    } catch (error) {
      throw new InternalServerErrorException(error)
    }
  }

  async findUserAuctions(userId: string): Promise<Auction[]> {
    if (!userId) throw new BadRequestException('User ID must be provided.')
    this.checkActiveAuctions()
    try {
      const activeUserAuctions = (await this.auctionRepository.find({
        where: { owner: { id: userId } },
        order: {
          is_active: 'DESC',
          end_date: 'ASC',
        },
        relations: ['owner', 'bids', 'bids.owner'],
      })) as Auction[]
      return activeUserAuctions
    } catch (error) {
      throw new InternalServerErrorException(error)
    }
  }

  async createBid(auctionId: string, userId: string, createBidDto: CreateBidDto): Promise<Bid> {
    if (!auctionId || !userId) throw new BadRequestException('Auction and User ID must be provided')
    if (!createBidDto) throw new BadRequestException('Bid details must be provided')
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } })
      if (!user) throw new NotFoundException('User not found')
      const auction = await this.auctionRepository.findOne({ where: { id: auctionId }, relations: ['owner', 'bids'] })
      if (!auction) throw new NotFoundException('Auction not found')
      if (auction.owner.id === user.id) throw new BadRequestException('You cant bid on your own auction')
      const highest_bid = await this.findHighestBid(auctionId)
      if (highest_bid && highest_bid.amount >= createBidDto.amount) {
        throw new BadRequestException('Your bid must be higher than the current bid')
      }
      if (!highest_bid && auction.starting_price >= createBidDto.amount) {
        throw new BadRequestException('Your bid must be higher than the starting price')
      }
      const newBid = this.bidRepository.create({ ...createBidDto, owner: user, auction: auction })
      Logger.log(`Creating new bid by ${userId} user id.`)
      return this.bidRepository.save(newBid)
    } catch (error) {
      if (error instanceof NotFoundException || BadRequestException) throw error
      Logger.error(error)
      Logger.error(`Error while creating bid for auction ${auctionId} by user ${userId}: ${error.message}`)
      throw new InternalServerErrorException('Something went wrong while creating a new bid.')
    }
  }

  async findHighestBid(auctionId: string): Promise<Bid> {
    if (!auctionId) throw new BadRequestException('Auction ID must be provided.')
    return this.bidRepository
      .createQueryBuilder('bid')
      .leftJoinAndSelect('bid.owner', 'owner')
      .where('bid.auction_id = :auctionId', { auctionId })
      .orderBy('bid.amount', 'DESC')
      .getOne()
  }

  async updateAuctionImageUrl(auctionId: string, image: string): Promise<Auction> {
    if (!auctionId) throw new BadRequestException('Auction ID must be provided')
    if (!image) throw new BadRequestException('Image must be provided')
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
    })
    if (!auction) throw new NotFoundException('Auction not found')
    auction.image = image
    return this.auctionRepository.save(auction)
  }

  async createNotifications(auctionId: string): Promise<void> {
    if (!auctionId) throw new BadRequestException('Auction ID must be provided')
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
      relations: ['bids', 'bids.owner', 'owner'],
    })
    if (!auction) throw new NotFoundException('Auction not found')
    if (auction.is_active) throw new BadRequestException('Auction is still active')
    if (auction.bids.length === 0) return
    const highestBid = await this.findHighestBid(auctionId)
    await this.sendNotification(highestBid.owner, auction, true)
    const notificationPromises = auction.bids
      .filter((bid: Bid) => bid.id !== highestBid.id)
      .map((bid: Bid) => this.sendNotification(bid.owner, auction, false))

    await Promise.all(notificationPromises)
    Logger.log(`Notiications sent for auction ${auctionId}`)
  }

  private async sendNotification(recipient: User, auction: Auction, isWon: boolean) {
    try {
      const message = isWon ? 'Won' : 'Outbid'
      const notification = new Notification()
      notification.recipient = recipient
      notification.auction = auction
      notification.message = message
      await this.notificationRepository.save(notification)
    } catch (error) {
      Logger.error(`Failed to send notification to user ${recipient.id}: ${error.message}`)
    }
  }

  async findUserNotifications(userId: string): Promise<Notification[]> {
    if (!userId) throw new BadRequestException('User ID must be provided.')
    try {
      await this.checkActiveAuctions()
      const activeUserNotifications = (await this.notificationRepository.find({
        where: {
          recipient: { id: userId },
          is_read: false,
        },
        relations: ['auction', 'auction.bids'],
      })) as Notification[]
      return activeUserNotifications
    } catch (error) {
      throw new InternalServerErrorException(error)
    }
  }

  async deactivateAuction(auctionId: string): Promise<Auction> {
    if (!auctionId) throw new BadRequestException('Auction ID must be provided')
    const auction: Auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
      relations: ['bids', 'bids.owner'],
    })
    auction.end_date = '2023-12-17T03:24:00'
    return this.auctionRepository.save(auction)
  }

  async markAsRead(id: string): Promise<Notification> {
    if (!id) throw new BadRequestException('Notification ID must be provided.')
    const notification: Notification = await this.notificationRepository.findOne({ where: { id } })
    notification.is_read = true
    return this.notificationRepository.save(notification)
  }
}
