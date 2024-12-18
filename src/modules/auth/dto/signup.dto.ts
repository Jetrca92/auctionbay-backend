import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator'
import { Match } from 'decorators/match.decorator'

export class SignupDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  first_name?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  last_name?: string

  @ApiProperty({ required: true })
  @IsNotEmpty()
  @IsEmail()
  email: string

  @ApiProperty({ required: true })
  @IsNotEmpty()
  @Matches(/^(?=.*\d)[A-Za-z.\s_-]+[\w~@#$%^&*+=`|{}:;!.?"()[\]-]{6,}/, {
    message:
      'Password must have at least one number, lower or upper case letter and it has to be longer than 5 characters.',
  })
  @IsString()
  password: string

  @ApiProperty({ required: true })
  @IsNotEmpty()
  @Match(SignupDto, (field) => field.password, { message: 'Passwords do not match.' })
  @IsString()
  confirm_password: string
}
