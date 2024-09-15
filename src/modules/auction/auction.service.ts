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

@Injectable()
export class AuctionService extends AbstractService {
  constructor(
    @InjectRepository(Auction) private readonly auctionRepository: Repository<Auction>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {
    super(auctionRepository)
  }

  async create(createAuctionDto: CreateAuctionDto, userId: string): Promise<Auction> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } })
      if (!user) {
        throw new BadRequestException('User not found')
      }
      const newAuction = this.auctionRepository.create({ ...createAuctionDto, owner: user })
      Logger.log(`Creating new auction ${newAuction.title} by ${userId} user id.`)
      return this.auctionRepository.save(newAuction)
    } catch (error) {
      Logger.log(error)
      throw new InternalServerErrorException('Something went wrong while creating a new auction.')
    }
  }

  async update(auctionId: string, userId: string, updateAuctionDto: UpdateAuctionDto): Promise<Auction> {
    const auction = (await this.findById(auctionId, ['owner'])) as Auction
    if (!auction) throw new NotFoundException(`Auction with ID ${auctionId} not found`)
    if (auction && auction.owner) {
      console.log('Owner ID:', auction.owner.id)
    } else {
      console.log('Owner not found')
    }
    if (auction.owner.id !== userId) throw new ForbiddenException('You are the owner of this auction')
    try {
      Object.assign(auction, updateAuctionDto)
      return await this.auctionRepository.save(auction)
    } catch (error) {
      Logger.error(error)
      throw new InternalServerErrorException('Something went wrong while updating the auction.')
    }
  }
}
