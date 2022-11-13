# [multer-minio-sharp-storage](https://github.com/irvanherz/multer-minio-sharp-storage)

Streaming multer storage engine with [Sharp](https://github.com/lovell/sharp) image transformer for [MinIO](https://github.com/minio/minio-js).

## Installation

```bash
npm install multer-minio-sharp-storage
```

## Usage

### Storage Initialization

```ts
new MulterMinioSharpStorage(opts: MulterMinioSharpStorageOptions): MulterMinioSharpStorage
```
#### Options
| Name | Description | Type | Default |
| --- | --- | --- | --- |
| **key** | Object key generator callback | `KeyCallbackType` | `defaultKeyCallback` |
| **objectMeta** | Object metadata generator callback | `ObjectMetaCallbackType` | `defaultObjectMetaCallback` |
| **withSharpMeta** | Whether to include transformed image metadata | `boolean` | `true` |
| **bucket** | Storage bucket name | `string` | - |
| **clientOptions** | Minio storage options | `Minio.ClientOptions` | - |
| **transforms** | Array of transformation options. See example below | `TransformType[]` | - |
| **generator** | Multer file object (req.file) custom generator | `GeneratorCallbackType` | `defaultGeneratorCallback` |

### Example

```ts
import dotenv from 'dotenv'
import express, { Request, Response } from 'express'
import multer from 'multer'
import MulterMinioSharpStorage from 'multer-minio-sharp-storage'
import path from 'path'
import sharp from 'sharp'
import slugify from 'slugify'

dotenv.config()

const upload = multer({
  storage: new MulterMinioSharpStorage({
    key: (_req, file, t) => {
      const name = path.parse(file.originalname).name
      return slugify(name, { lower: true, trim: true }) + '_' + Date.now() + '_' + t.id + '.jpg'
    },
    objectMeta: (_req, _file, _t) => ({ 'Content-Type': 'image/jpeg' }),
    bucket: process.env.S3_BUCKET,
    transforms: [
      {
        id: '320',
        sharp: (_req, _file, _t) => sharp().resize(320).jpeg()
      },
      {
        id: '640',
        sharp: (_req, _file, _t) => sharp().resize(640).jpeg()
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

#### Output (req.file)

```json
 {
  "encoding": "7bit",
  "mimetype": "image/png",
  "fieldname": "file",
  "transforms": [
    {
      "id": "320",
      "meta": {
        "size": 8634,
        "depth": "uchar",
        "space": "srgb",
        "width": 320,
        "format": "jpeg",
        "height": 156,
        "density": 72,
        "channels": 3,
        "hasAlpha": false,
        "hasProfile": false,
        "isProgressive": false,
        "chromaSubsampling": "4:2:0"
      },
      "object": {
        "key": "screenshot-from-2022-06-21-17-17-30_1667311930415_320.jpg",
        "etag": "be001de1bed495bcfd9aa3c2841d3e18",
        "versionId": null
      },
      "status": "success"
    },
    {
      "id": "640",
      "meta": {
        "size": 30003,
        "depth": "uchar",
        "space": "srgb",
        "width": 640,
        "format": "jpeg",
        "height": 311,
        "density": 72,
        "channels": 3,
        "hasAlpha": false,
        "hasProfile": false,
        "isProgressive": false,
        "chromaSubsampling": "4:2:0"
      },
      "object": {
        "key": "screenshot-from-2022-06-21-17-17-30_1667311930416_640.jpg",
        "etag": "9a7acfbe757d920d2258bd33af83f912",
        "versionId": null
      },
      "status": "success"
    }
  ],
  "originalname": "Screenshot from 2022-06-21 17-17-30.png"
}
```
