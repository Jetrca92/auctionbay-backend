import { Body, Controller, Get, HttpCode, HttpStatus, Patch } from '@nestjs/common'
import { UserService } from './user.service'
import { User } from 'entities/user.entity'
import { UpdateUserDto } from './dto/update-user.dto'

@Controller('me')
export class UserController {
  constructor(private readonly usersService: UserService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<User[]> {
    return this.usersService.findAll()
  }

  @Patch('/update-password')
  @HttpCode(HttpStatus.OK)
  async update(@Body() updateUserDto: UpdateUserDto): Promise<User> {
    // TODO
    const id = '12'
    return this.usersService.update(id, updateUserDto)
  }
}
