import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { AbstractService } from '../common/abstract.service'
import { InjectRepository } from '@nestjs/typeorm'
import { User } from 'entities/user.entity'
import { Repository } from 'typeorm'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { compareHash, hash } from 'utils/bcrypt'
import { PostgresErrorCode } from 'helpers/postgresErrorCode.enum'

@Injectable()
export class UserService extends AbstractService {
  constructor(@InjectRepository(User) private readonly userRepository: Repository<User>) {
    super(userRepository)
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = await this.findBy({ email: createUserDto.email })
    if (user) {
      throw new BadRequestException('User with that email already exists.')
    }
    try {
      const newUser = this.userRepository.create({ ...createUserDto })
      return this.userRepository.save(newUser)
    } catch (error) {
      Logger.log(error)
      throw new BadRequestException('Something went wrong while creating a new user.')
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = (await this.findById(id)) as User
    const { email, password, confirm_password } = updateUserDto
    if (user.email !== email && email) {
      user.email = email
    }
    if (password && confirm_password) {
      if (password !== confirm_password) {
        throw new BadRequestException('Passwords do not match')
      }
      if (await compareHash(password, user.password)) {
        throw new BadRequestException('New password cannot be the same as your old password.')
      }
      user.password = await hash(password)
    }
    try {
      return await this.userRepository.save(user)
    } catch (error) {
      Logger.error('Error updating user')
      if (error?.code === PostgresErrorCode.UniqueViolation) {
        throw new BadRequestException('User with that username already exists')
      }
      throw new InternalServerErrorException('Something went wrong while updating the user.')
    }
  }
}
