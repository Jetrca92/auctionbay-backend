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

@Injectable()
export class AuctionService extends AbstractService {
  constructor(
    @InjectRepository(Auction) private readonly auctionRepository: Repository<Auction>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Bid) private readonly bidRepository: Repository<Bid>,
  ) {
    super(auctionRepository)
  }

  async create(createAuctionDto: CreateAuctionDto, userId: string): Promise<Auction> {
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
    const auction = (await this.findById(auctionId, ['owner'])) as Auction
    Logger.log('Current auction before update:', JSON.stringify(auction))
    if (!auction) throw new NotFoundException(`Auction with ID ${auctionId} not found`)
    if (auction && auction.owner) {
      console.log('Owner ID:', auction.owner.id)
    } else {
      console.log('Owner not found')
    }
    if (auction.owner.id !== userId) throw new ForbiddenException('You are not the owner of this auction')
    try {
      Object.assign(auction, updateAuctionDto)
      Logger.log('Auction after update:', JSON.stringify(auction))
      const savedAuction = await this.auctionRepository.save(auction)
      Logger.log('Auction saved', JSON.stringify(savedAuction))
      return savedAuction
    } catch (error) {
      Logger.error(error)
      throw new InternalServerErrorException('Something went wrong while updating the auction.')
    }
  }

  async handleDelete(auctionId: string, userId: string): Promise<Auction> {
    const auction = (await this.findById(auctionId, ['owner'])) as Auction
    if (!auction) throw new NotFoundException(`Auction with ID ${auctionId} not found`)
    if (auction.owner.id !== userId) throw new ForbiddenException('You are notthe owner of this auction')
    return this.remove(auctionId)
  }

  async checkActiveAuctions(): Promise<void> {
    try {
      const auctions = (await this.auctionRepository.find({
        where: { is_active: true },
      })) as Auction[]

      auctions.forEach((auction) => {
        auction.checkAndUpdateAuctionStatus()
      })
      await this.auctionRepository.save(auctions)
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
    try {
      const auction = await this.auctionRepository.findOne({
        where: { id: id },
        relations: ['owner', 'bids', 'bids.owner'],
      })
      return auction
    } catch (error) {
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
      const newBid = this.bidRepository.create({ ...createBidDto, owner: user, auction: auction })
      Logger.log(`Creating new bid by ${userId} user id.`)
      return this.bidRepository.save(newBid)
    } catch (error) {
      Logger.error(error)
      Logger.error(`Error while creating bid for auction ${auctionId} by user ${userId}: ${error.message}`)
      throw new InternalServerErrorException('Something went wrong while creating a new bid.')
    }
  }

  async findHighestBid(auctionId: string): Promise<Bid> {
    return this.bidRepository
      .createQueryBuilder('bid')
      .where('bid.auction_id = :auctionId', { auctionId })
      .orderBy('bid.amount', 'DESC')
      .getOne()
  }

  async updateAuctionImageUrl(auctionId: string, image: string): Promise<Auction> {
    const auction = await this.findById(auctionId)
    if (!auction) throw new NotFoundException('Auction not found')
    auction.image = image
    return this.auctionRepository.save(auction)
  }
}
