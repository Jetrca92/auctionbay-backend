import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm'
import { Base } from './base.entity'
import { User } from './user.entity'
import { Auction } from './auction.entity'
import { IsNumber } from 'class-validator'

@Entity()
export class Bid extends Base {
  @ManyToOne(() => User, (user) => user.bids)
  @JoinColumn({ name: 'user_id' })
  owner: User

  @Column('decimal')
  @IsNumber()
  amount: number

  @ManyToOne(() => Auction, (auction) => auction.bids, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auction_id' })
  auction: Auction
}
