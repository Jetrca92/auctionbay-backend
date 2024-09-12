import { Body, Controller, Post } from '@nestjs/common'
import { AuthService } from './auth.service'
import { SigninDto, SignupDto } from './dto'

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signin')
  signin(@Body() dto: SigninDto) {
    return this.authService.signin(dto)
  }

  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto)
  }
}
