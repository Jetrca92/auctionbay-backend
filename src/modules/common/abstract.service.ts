import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { Repository } from 'typeorm'

@Injectable()
export abstract class AbstractService {
  constructor(protected readonly repository: Repository<any>) {}

  async findAll(relations = []): Promise<any[]> {
    try {
      return this.repository.find({ relations })
    } catch (error) {
      Logger.log(error)
      throw new InternalServerErrorException('Something went wrong while searchig for a list of elements.')
    }
  }

  async findBy(condition, relations = []): Promise<any> {
    if (!condition || typeof condition !== 'object') throw new BadRequestException('Invalid condition provided')
    try {
      return await this.repository.findOne({
        where: condition,
        relations,
      })
    } catch (error) {
      Logger.log(error)
      throw new InternalServerErrorException(
        `Something went wrong while searchig for an element with condition: ${JSON.stringify(condition)}`,
      )
    }
  }

  async findById(id: string, relations = []): Promise<any> {
    if (!id || typeof id !== 'string') throw new BadRequestException('Invalid ID format provided')
    try {
      const element = await this.repository.findOne({
        where: { id },
        relations,
      })
      if (!element) {
        throw new NotFoundException(`Cannot find elemnt with id: ${id}`)
      }
      return element
    } catch (error) {
      Logger.log(error)
      throw new InternalServerErrorException(`Something went wrong while searching for an element with an id: ${id}`)
    }
  }

  async remove(id: string): Promise<any> {
    if (!id || typeof id !== 'string') throw new BadRequestException('Invalid ID format provided')
    const element = await this.findById(id)
    try {
      return this.repository.remove(element)
    } catch (error) {
      Logger.log(error)
      throw new InternalServerErrorException('Something went wrong while deleting an element.')
    }
  }
}
