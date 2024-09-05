import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm'
import { Base } from './base.entity'
import { User } from './user.entity'
import { Bid } from './bid.entity'

@Entity()
export class Auction extends Base {
  @Column()
  title: string

  @Column({ nullable: true })
  image: string

  @Column()
  description: string

  @Column()
  starting_price: number

  @Column()
  auction_duration_hrs: number

  @Column()
  is_active: boolean

  @ManyToOne(() => User, (user) => user.auctions)
  @JoinColumn({ name: 'auction_id' })
  owner: User

  @OneToMany(() => Bid, (bid) => bid.auction)
  bids: Bid[]
}
