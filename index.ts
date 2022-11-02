/* global Express */
import { Request } from 'express'
import { Client, ClientOptions, ItemBucketMetadata } from 'minio'
import multer from 'multer'
import path from 'path'
import sharp from 'sharp'

export type TransformType = {
  id: string
  sharp: sharp.Sharp
  key?: (req: Request, file: Express.Multer.File, transform: TransformType) => string
  objectMeta?: (req: Request, file: Express.Multer.File, transform: TransformType) => ItemBucketMetadata
}

export type ExtendedMulterFileType = Partial<Express.Multer.File & { [prop: string]: any }>
export type KeyCallbackType = (req: Request, file: Express.Multer.File, transform: TransformType) => string
export type ObjectMetaCallbackType = (req: Request, file: Express.Multer.File, transform: TransformType) => ItemBucketMetadata
export type TransformedType = { id: string, status: 'success' | 'error', object?: ItemBucketMetadata & { key: string }, meta?: sharp.Metadata }
export type HandleFileCallbackInfoType = ExtendedMulterFileType
export type HandleFileCallbackType = (error?: any, info?: HandleFileCallbackInfoType) => void
export type GeneratorCallbackParamsType = {
  // eslint-disable-next-line no-use-before-define
  opts: MulterMinioSharpStorageOptions,
  file: Express.Multer.File,
  transforms: TransformedType[]
}
export type GeneratorCallbackType = (params: GeneratorCallbackParamsType) => ExtendedMulterFileType

export type MulterMinioSharpStorageOptions = {
  key?: KeyCallbackType
  objectMeta?: ObjectMetaCallbackType
  withSharpMeta?: boolean
  bucket: string
  clientOptions: ClientOptions
  transforms: TransformType[]
  generator?: GeneratorCallbackType
}

const defaultKeyCallback: KeyCallbackType = (_req, file) => {
  const fileExt = path.extname(file.originalname)
  return `${Date.now()}${fileExt}`
}

const defaultGeneratorCallback: GeneratorCallbackType = (params) => {
  return {
    ...params.file,
    transforms: params.transforms
  }
}

const defaultObjectMetaCallback: ObjectMetaCallbackType = (_req, _file, _transform) => ({})

class MulterMinioSharpStorage implements multer.StorageEngine {
  private opts: MulterMinioSharpStorageOptions
  private key?: KeyCallbackType
  private objectMeta?: ObjectMetaCallbackType
  private withSharpMeta?: boolean
  private generator?: GeneratorCallbackType
  private bucket: string
  private minioClient: Client
  private transforms: TransformType[]

  constructor(opts: MulterMinioSharpStorageOptions) {
    const { withSharpMeta = true } = opts
    this.opts = opts
    this.key = opts.key
    this.objectMeta = opts.objectMeta
    this.withSharpMeta = withSharpMeta
    this.generator = opts.generator
    this.bucket = opts.bucket
    this.transforms = opts.transforms
    this.minioClient = new Client(opts.clientOptions)
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
        t.transforms.map(async transform => {
          const keyFn = transform.key || t.key || defaultKeyCallback
          const key = keyFn(req, file, transform)
          const media = sharp()
          const transformed = sharp()
          let transformedMetadata: sharp.Metadata
          if (t.withSharpMeta) {
            untransformed.pipe(media).pipe(transform.sharp).pipe(transformed)
            transformedMetadata = await transformed.metadata()
          }
          const objectMetaFn = transform.objectMeta || t.objectMeta || defaultObjectMetaCallback
          const objectMeta = objectMetaFn(req, file, transform)
          return await t.minioClient
            .putObject(t.bucket, key, transformed, objectMeta)
            .then(objectInfo => {
              const res: TransformedType = {
                id: transform.id,
                status: 'success',
                object: { ...objectInfo, key },
                meta: { ...transformedMetadata }
              }
              return res
            })
            // eslint-disable-next-line n/handle-callback-err
            .catch(err => {
              const res: TransformedType = {
                id: transform.id,
                status: 'error'
              }
              return res
            })
        })
      )
      return res
    }

    transformation().then(transforms => {
      const generatorFn = this.generator || defaultGeneratorCallback
      const res = generatorFn({
        opts: this.opts,
        file,
        transforms
      })
      callback(null, res)
    })
  }

  _removeFile = (_req: Request, file: Express.Multer.File, callback: (error: Error | null) => void): void => {
    callback(null)
    // NOT YET IMPLEMENTED
    // this.minioClient.removeObject(this.bucket, file.filename, () => callback(null))
  }
}

export default MulterMinioSharpStorage
