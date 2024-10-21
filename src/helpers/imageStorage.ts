const FileType = import('file-type')
import { Logger } from '@nestjs/common'
import fs from 'fs'
import { diskStorage, Options } from 'multer'
import { extname } from 'path'

type validFileExtensionsType = 'png' | 'jpg' | 'jpeg'
type validMimeType = 'image/png' | 'image/jpg' | 'image/jpeg'

const validFileExtensions: validFileExtensionsType[] = ['png', 'jpg', 'jpeg']
const validMimeTypes: validMimeType[] = ['image/png', 'image/jpg', 'image/jpeg']

export const saveImageToStorage: Options = {
  storage: diskStorage({
    destination: './files',
    filename(req, file, callback) {
      // Create unique suffix
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
      // Get file extension
      const ext = extname(file.originalname)
      //Write filename
      const filename = `${uniqueSuffix}${ext}`

      callback(null, filename)
    },
  }),
  fileFilter(req, file, callback) {
    const allowedMimeTypes: validMimeType[] = validMimeTypes
    if (allowedMimeTypes.includes(file.mimetype as validMimeType)) {
      callback(null, true)
    } else {
      callback(null, false)
    }
  },
}

export const isFileExtensionSafe = async (fullFilePath: string): Promise<boolean> => {
  return (await FileType).fileTypeFromFile(fullFilePath).then((fileExtensionAndMimeType) => {
    if (!fileExtensionAndMimeType?.ext || !fileExtensionAndMimeType.mime) return false

    const isFileTypeLegit = validFileExtensions.includes(fileExtensionAndMimeType.ext as validFileExtensionsType)
    const isMimeTypeLegit = validMimeTypes.includes(fileExtensionAndMimeType.mime as validMimeType)
    const isFileLegit = isFileTypeLegit && isMimeTypeLegit
    return isFileLegit
  })
}

export const removeFile = (fullFilePath: string): void => {
  try {
    fs.unlinkSync(fullFilePath)
  } catch (error) {
    Logger.error(error)
  }
}
