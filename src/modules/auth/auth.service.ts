import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { LoginDto, SignupDto } from './dto'
import { UserService } from 'modules/user/user.service'
import { JwtService } from '@nestjs/jwt'
import { User } from 'entities/user.entity'
import { compareHash, hash } from 'utils/bcrypt'

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}
  async login(dto: LoginDto) {
    Logger.log('Validating user ...')
    const user = await this.userService.findBy({ username: dto.username })
    if (!user) throw new UnauthorizedException('Invalid credentials')
    if (!(await compareHash(dto.password, user.password))) throw new UnauthorizedException('Invalid credentials')

    return this.generateJwt(user)
  }

  async signup(dto: SignupDto): Promise<User> {
    const hashedPassword = await hash(dto.password)
    return this.userService.create({
      ...dto,
      password: hashedPassword,
    })
  }

  async generateJwt(user: User): Promise<string> {
    return this.jwtService.signAsync({ sub: user.id, username: user.username })
  }
}
