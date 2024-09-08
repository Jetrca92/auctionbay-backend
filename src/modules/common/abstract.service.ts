import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
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
    try {
      const element = await this.repository.findOne({
        where: { id },
        relations,
      })
      if (!element) {
        throw new BadRequestException(`Cannot find elemnt with id: ${id}`)
      }
      return element
    } catch (error) {
      Logger.log(error)
      throw new InternalServerErrorException(`Something went wrong while searchig for an element with an id: ${id}`)
    }
  }

  async remove(id: string): Promise<any> {
    const element = await this.findById(id)
    try {
      return this.repository.remove(element)
    } catch (error) {
      Logger.log(error)
      throw new InternalServerErrorException('Something went wrong while deleting an element.')
    }
  }
}
