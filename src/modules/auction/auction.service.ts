import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Auction } from 'entities/auction.entity'
import { AbstractService } from 'modules/common/abstract.service'
import { CreateAuctionDto } from 'modules/auction/dto/create-auction.dto'
import { Repository } from 'typeorm'
import { User } from 'entities/user.entity'

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
      Logger.log(JSON.stringify(newAuction))
      return this.auctionRepository.save(newAuction)
    } catch (error) {
      Logger.log(error)
      throw new BadRequestException('Something went wrong while creating a new auction.')
    }
  }
}
