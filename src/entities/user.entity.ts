import { Column, Entity, OneToMany } from 'typeorm'
import { Base } from './base.entity'
import { Exclude } from 'class-transformer'
import { Auction } from './auction.entity'
import { Bid } from './bid.entity'
import { IsEmail, IsOptional, IsString } from 'class-validator'

@Entity()
export class User extends Base {
  @Column({ unique: true })
  @IsString()
  username: string

  @Column({ nullable: true })
  @IsEmail()
  @IsOptional()
  email: string

  @Column()
  @IsString()
  @Exclude()
  password: string

  @OneToMany(() => Auction, (auction) => auction.owner)
  auctions: Auction[]

  @OneToMany(() => Bid, (bid) => bid.owner)
  bids: Bid[]
}
