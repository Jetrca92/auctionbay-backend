import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm'
import { Base } from './base.entity'
import { User } from './user.entity'
import { Auction } from './auction.entity'

@Entity()
export class Notification extends Base {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  recipient: User

  @Column()
  message: string

  @ManyToOne(() => Auction, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auction_ id' })
  auction: Auction

  @Column({ default: false })
  is_read: boolean
}
