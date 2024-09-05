import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm'
import { Base } from './base.entity'
import { User } from './user.entity'
import { Auction } from './auction.entity'

@Entity()
export class Bid extends Base {
  @ManyToOne(() => User, (user) => user.bids)
  @JoinColumn({ name: 'auction_id' })
  owner: User

  @Column()
  is_active: boolean

  @Column()
  amount: number

  @ManyToOne(() => Auction, (auction) => auction.bids)
  @JoinColumn({ name: 'auction_id' })
  auction: Auction
}
