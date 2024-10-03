import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'

export class CreateAuctionDto {
  @ApiProperty({ required: true })
  @IsNotEmpty()
  @IsString()
  title: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  image?: string

  @ApiProperty({ required: true })
  @IsNotEmpty()
  @IsString()
  description: string

  @ApiProperty({ required: true })
  @IsNotEmpty()
  @IsNumber()
  starting_price: number

  @ApiProperty({ required: true })
  @IsNotEmpty()
  @IsString()
  end_date: string

  @ApiProperty({ required: true })
  @IsNotEmpty()
  @IsBoolean()
  is_active: boolean = true
}
