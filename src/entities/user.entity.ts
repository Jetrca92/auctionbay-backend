import { Column, Entity, OneToMany } from 'typeorm'
import { Base } from './base.entity'
import { Exclude } from 'class-transformer'
import { Auction } from './auction.entity'
import { Bid } from './bid.entity'

@Entity()
export class User extends Base {
  @Column({ unique: true })
  username: string

  @Column({ nullable: true })
  email: string

  @Exclude()
  password: string

  @OneToMany(() => Auction, (auction) => auction.owner)
  auctions: Auction[]

  @OneToMany(() => Bid, (bid) => bid.owner)
  bids: Bid[]
}
