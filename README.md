# [multer-sharp-minio-storage](https://github.com/irvanherz/multer-sharp-minio-storage)

Streaming multer storage engine with [Sharp](https://github.com/lovell/sharp) image transformer for [MinIO](https://github.com/minio/minio-js).

## Installation

```bash
npm install multer-sharp-minio-storage
```

## Usage

```ts
import dotenv from 'dotenv'
import express, { Request, Response } from 'express'
import multer from 'multer'
import MulterSharpMinioStorage from 'multer-sharp-minio-storage'
import path from 'path'
import sharp from 'sharp'
import slugify from 'slugify'

dotenv.config()

const upload = multer({
  storage: new MulterSharpMinioStorage({
    filename: (_req, file, t) => {
      const name = path.parse(file.originalname).name
      return slugify(name, { lower: true, trim: true }) + '_' + Date.now() + '_' + t.id + '.jpg'
    },
    meta: (_req, _file, _t) => ({ 'Content-Type': 'image/jpeg' }),
    bucket: process.env.S3_BUCKET,
    transforms: [
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

const app = express()
app.post(
  '/upload-image',
  upload.single('file'),
  (req: Request, res: Response) => {
    try {
      return res.status(200).json(req.file)
    } catch (err) {
      console.log(err)
      return res.status(500).send('Error')
    }
  }
)

app.listen(+process.env.PORT, process.env.HOST, () => {
  console.log(`Listening on ${process.env.HOST}:${process.env.PORT}`)
})

```

### Output Example (req.file)

```json
{
  "fieldname": "file",
  "originalname": "Screenshot from 2022-06-21 14-09-24.jpg",
  "encoding": "7bit",
  "mimetype": "image/jpeg",
  "transforms": [
    {
      "id": "320",
      "status": "success",
      "filename": "screenshot-from-2022-06-21-14-09-24_1667271069830_320.jpg",
      "destination": "https://is3.cloudhost.id/liburanaja/screenshot-from-2022-06-21-14-09-24_1667271069830_320.jpg",
      "fieldname": "file",
      "meta": {
        "format": "jpeg",
        "size": 6837,
        "width": 320,
        "height": 240,
        "space": "srgb",
        "channels": 3,
        "depth": "uchar",
        "density": 72,
        "chromaSubsampling": "4:2:0",
        "isProgressive": false,
        "hasProfile": false,
        "hasAlpha": false,
        "objectInfo": {
          "etag": "c925ddf7dc870a5b14c876add99514fc",
          "versionId": null
        }
      }
    },
    {
      "id": "640",
      "status": "success",
      "filename": "screenshot-from-2022-06-21-14-09-24_1667271069831_640.jpg",
      "destination": "https://is3.cloudhost.id/liburanaja/screenshot-from-2022-06-21-14-09-24_1667271069831_640.jpg",
      "fieldname": "file",
      "meta": {
        "format": "jpeg",
        "size": 20497,
        "width": 640,
        "height": 480,
        "space": "srgb",
        "channels": 3,
        "depth": "uchar",
        "density": 72,
        "chromaSubsampling": "4:2:0",
        "isProgressive": false,
        "hasProfile": false,
        "hasAlpha": false,
        "objectInfo": {
          "etag": "479c49703f98f628d8a3a2a570386247",
          "versionId": null
        }
      }
    }
  ]
}
```
