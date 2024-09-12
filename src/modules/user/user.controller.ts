import { Body, Controller, Get, HttpCode, HttpStatus, Patch, UseGuards } from '@nestjs/common'
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
  async findAll(@GetCurrentUserById() userId: string): Promise<User[]> {
    console.log('findAll()', userId)
    return this.usersService.findAll()
  }

  @Patch('/update-password')
  @HttpCode(HttpStatus.OK)
  async update(@Body() updateUserDto: UpdateUserDto, @GetCurrentUserById() userId: string): Promise<User> {
    // TODO
    return this.usersService.update(userId, updateUserDto)
  }
}
