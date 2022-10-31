# [multer-sharp-minio-storage](https://github.com/irvanherz/multer-sharp-minio-storage)

Streaming multer storage engine with [Sharp](https://github.com/lovell/sharp) image transformer for [MinIO](https://github.com/minio/minio-js).

## Installation

```bash
npm install multer-sharp-minio-storage@latest
```

## Usage

```ts
import multer from 'multer'
import path from 'path'
import sharp from 'sharp'
import slugify from 'slugify'
import MulterSharpMinioStorage from 'multer-sharp-minio-storage'

const upload = multer({
  storage: new MulterSharpMinioStorage({
    filename: (_req, file, t) => {
      const name = path.parse(file.originalname).name
      return slugify(name, { lower: true, trim: true }) + '_' + Date.now() + '_' + t.id + '.jpg'
    },
    meta: (_req, _file, _t) => ({ 'Content-Type': 'image/jpeg' }),
    bucket: process.env.S3_BUCKET,
    transformers: [
      {
        id: '320',
        sharp: sharp().resize(320).jpeg()
      },
      {
        id: '640',
        sharp: sharp().resize(640).jpeg()
      }
    ],
    clientOptions: {
      endPoint: process.env.S3_ENDPOINT,
      accessKey: process.env.S3_ACCESS_KEY_ID,
      secretKey: process.env.S3_SECRET_ACCESS_KEY
    }
  })
})

export const uploadImage = upload.single('file')
```
