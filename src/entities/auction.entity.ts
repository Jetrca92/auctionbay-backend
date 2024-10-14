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
  @IsString()
  end_date: string

  @Column({ default: true })
  @IsBoolean()
  is_active: boolean

  @ManyToOne(() => User, (user) => user.auctions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  owner: User

  @OneToMany(() => Bid, (bid) => bid.auction)
  bids: Bid[]

  getEndDateAsDate(): Date {
    const endDate = new Date(this.end_date)

    const createdAtTime = this.created_at
    const hours = createdAtTime.getHours()
    const minutes = createdAtTime.getMinutes()
    const seconds = createdAtTime.getSeconds()

    endDate.setHours(hours, minutes, seconds)

    return endDate
  }

  checkAndUpdateAuctionStatus(): boolean {
    const currentDate = new Date()
    const auctionEndDate = this.getEndDateAsDate()
    auctionEndDate.setHours(this.created_at.getHours(), this.created_at.getMinutes(), this.created_at.getSeconds())

    // Check if the current date is past the auction's end date
    if (currentDate > auctionEndDate && this.is_active) {
      this.is_active = false
      return true
    }
    return false
  }
}
