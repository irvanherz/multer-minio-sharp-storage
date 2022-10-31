import { Request } from 'express'
import { Client, ClientOptions, ItemBucketMetadata } from 'minio'
import multer from 'multer'
import path from 'path'
import sharp from 'sharp'

export type TransformerType = {
  id: string
  sharp: sharp.Sharp
  filename?: (req: Request, file: Express.Multer.File, transformer: TransformerType) => string
  meta?: (req: Request, file: Express.Multer.File, transformer: TransformerType) => ItemBucketMetadata
}

export type FilenameCallbackType = (req: Request, file: Express.Multer.File, transformer: TransformerType) => string
export type ObjectMetaCallbackType = (req: Request, file: Express.Multer.File, transformer: TransformerType) => ItemBucketMetadata
export type TransformedType = Partial<Express.Multer.File> & { id: string, status: 'success' | 'error', meta?: any }
export type HandleFileCallbackInfoType = Partial<Express.Multer.File> & { transformed: TransformedType[] }
export type HandleFileCallbackType = (error?: any, info?: HandleFileCallbackInfoType) => void

export type MulterSharpMinioStorageOptions = {
  filename?: FilenameCallbackType
  meta?: ObjectMetaCallbackType
  bucket: string
  clientOptions: ClientOptions
  transformers: TransformerType[]
}

const defaultFilenameCallback: FilenameCallbackType = (_req, file) => {
  const fileExt = path.extname(file.originalname)
  return `${Date.now()}${fileExt}`
}

const defaultObjectMetaCallback: ObjectMetaCallbackType = (_req, _file, _transformer) => ({})

class MulterSharpMinioStorage implements multer.StorageEngine {
  private filename?: FilenameCallbackType
  private meta?: ObjectMetaCallbackType
  private bucket: string
  private minioClient: Client
  private transformers: TransformerType[]
  private minioClientOptions: ClientOptions

  constructor(opts: MulterSharpMinioStorageOptions) {
    this.filename = opts.filename
    this.meta = opts.meta
    this.bucket = opts.bucket
    this.transformers = opts.transformers
    this.minioClient = new Client(opts.clientOptions)
    this.minioClientOptions = opts.clientOptions
  }

  _handleFile(
    req: Request,
    file: Express.Multer.File,
    callback: HandleFileCallbackType
  ) {
    const t = this
    async function transformation() {
      const untransformed = file.stream
      const res: TransformedType[] = await Promise.all(
        t.transformers.map(async transformer => {
          const filenameFn = transformer.filename || t.filename || defaultFilenameCallback
          const filename = filenameFn(req, file, transformer)
          const media = sharp()
          const transformed = sharp()
          untransformed.pipe(media).pipe(transformer.sharp).pipe(transformed)
          const transformedMetadata = await transformed.metadata()
          const objectMetaFn = transformer.meta || t.meta || defaultObjectMetaCallback
          const objectMeta = objectMetaFn(req, file, transformer)
          return await t.minioClient
            .putObject(t.bucket, filename, transformed, objectMeta)
            .then(objectInfo => {
              const co = t.minioClientOptions
              const destination = `${co.useSSL ? 'https' : 'http'}://${co.endPoint}/${t.bucket}/${filename}`
              const res: TransformedType = {
                id: transformer.id,
                status: 'success',
                filename,
                destination,
                fieldname: file.fieldname,
                meta: { ...transformedMetadata, objectInfo }
              }
              return res
            })
            // eslint-disable-next-line n/handle-callback-err
            .catch(err => {
              const res: TransformedType = {
                id: transformer.id,
                status: 'error'
              }
              return res
            })
        })
      )
      return res
    }

    transformation().then(res => {
      callback(null, { transformed: res })
    })
  }

  _removeFile = (_req: Request, file: Express.Multer.File, callback: (error: Error | null) => void): void => {
    callback(null)
    // NOT YET IMPLEMENTED
    // this.minioClient.removeObject(this.bucket, file.filename, () => callback(null))
  }
}

export default MulterSharpMinioStorage
