import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm'
import { Base } from './base.entity'
import { User } from './user.entity'
import { Bid } from './bid.entity'
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator'

@Entity()
export class Auction extends Base {
  @Column()
  @IsString()
  title: string

  @Column({ nullable: true })
  @IsOptional()
  image: string

  @Column()
  @IsString()
  description: string

  @Column()
  @IsNumber()
  starting_price: number

  @Column()
  @IsNumber()
  auction_duration_hrs: number

  @Column()
  @IsBoolean()
  is_active: boolean

  @ManyToOne(() => User, (user) => user.auctions)
  @JoinColumn({ name: 'user_id' })
  owner: User

  @OneToMany(() => Bid, (bid) => bid.auction)
  bids: Bid[]
}
