import { ConfigService } from '@nestjs/config'
import { TypeOrmModuleOptions } from '@nestjs/typeorm'
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions'

type ConfigType = TypeOrmModuleOptions & PostgresConnectionOptions
type ConnectionOptions = ConfigType

export const ORMConfig = async (configService: ConfigService): Promise<ConnectionOptions> => {
  const isTestStage = process.env.STAGE === 'test'

  return {
    type: 'postgres',
    host: configService.get('DATABASE_HOST'),
    port: parseInt(configService.get('DATABASE_PORT')),
    username: configService.get('DATABASE_USERNAME'),
    password: configService.get('DATABASE_PWD'),
    database: configService.get('DATABASE_NAME'),
    entities: [isTestStage ? 'src/**/*.entity.ts' : 'dist/**/*.entity.js'],
    synchronize: false,
    ssl: false,
  }
}
