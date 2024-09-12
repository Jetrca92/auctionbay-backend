import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { UserService } from './user.service'
import { User } from 'entities/user.entity'
import { UpdateUserDto } from './dto/update-user.dto'
import { AuthGuard } from '@nestjs/passport'
import { GetCurrentUserById } from 'utils/get-user-by-id.decorator'

@Controller('me')
export class UserController {
  constructor(private readonly usersService: UserService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(ClassSerializerInterceptor)
  async findCurrentUser(@GetCurrentUserById() userId: string): Promise<User> {
    return this.usersService.findById(userId)
  }

  @Patch('/update-password')
  @HttpCode(HttpStatus.OK)
  async update(@Body() updateUserDto: UpdateUserDto, @GetCurrentUserById() userId: string): Promise<User> {
    return this.usersService.update(userId, updateUserDto)
  }
}
