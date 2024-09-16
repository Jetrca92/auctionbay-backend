import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber, Min } from 'class-validator'

export class CreateBidDto {
  @ApiProperty({ required: true })
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01, { message: 'Bid amount must be greater than 0' })
  amount: number
}
