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

  @Column({ default: true })
  @IsBoolean()
  is_active: boolean

  @ManyToOne(() => User, (user) => user.auctions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  owner: User

  @OneToMany(() => Bid, (bid) => bid.auction)
  bids: Bid[]

  get end_time(): Date {
    const start = this.created_at
    const durationInMillis = this.auction_duration_hrs * 3600000
    return new Date(start.getTime() + durationInMillis)
  }
}
