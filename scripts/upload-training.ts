import fs from 'fs';
import path from 'path';
import https from 'https';
import { createFlag, checkFlag, removeFlag } from './file-flags.ts';

import {uploads as research} from "./files.js"
import {uploads as excel} from "./files2.js"
import { readFile, stat } from 'fs/promises';
import { DBForgeRaceSubmission, ForgeSubmissionProcessingStatus, TrainingPoolStatus } from '../src/types/index.js';
import { createHash } from 'crypto';
// @ts-ignore
import { AWSS3Service } from '../src/services/aws';
// @ts-ignore
import * as Models from '../src/models/Models.ts';
// @ts-ignore
import { ApiError } from '../src/middleware/types/errors';
import mongoose, { ConnectOptions, Connection } from 'mongoose';
import { ForgeRaceSubmissionModel, ForgeRaceSubmissionModelFromConnection } from '../src/models/Models.ts';

const excelBaseDir = path.join("/Users/farag/Downloads/drive-download-20250703T092901Z-1-001","excel", "sh", "downloads")
const researchBaseDir = path.join("/Users/farag/Downloads/drive-download-20250703T092901Z-1-001","academic", "sh", "downloads")

console.log(`research base: ${researchBaseDir}`);
console.log(`excel base: ${excelBaseDir}`);


const uploadAll  = async (files :{url: string, id:string, filename: string}[], baseDir: string, db: Connection, poolName: string) =>  {
  const metaFile = 'meta.json'
  const inputLogfile = 'input_log.jsonl'
  const recordingFile = 'recording.mp4'
  const requiredFiles = [metaFile, inputLogfile, recordingFile]

  const uploads = files.filter(f => f.filename === metaFile);
  // {
  //   "url": "https://training-gym.s3.us-east-2.amazonaws.com/forge-races/1746666734804-input_log.jsonl",
  //   "id": "ebe22b5bb807560ca3ac33c9879bfb5d2027e1a1fd19dc30539bd79c6098cacd",
  //   "filename": "meta.json"
  // },
  //basepath/{id}/filename
  let index = 0
  let total = uploads.length;
  for (const upload of uploads) {
    index++
    const uploadPath = path.join(baseDir, upload.id)
    // Read and parse meta.json
    console.log(`${index}/${total} [UPLOAD] Reading meta.json from extracted files`);
    const metaJsonPath = path.join(uploadPath, metaFile);
    console.log(`${index}/${total}  [UPLOAD] Meta JSON path: ${metaJsonPath}`);
    const metaJson = await readFile(metaJsonPath, 'utf8');
    console.log(`${index}/${total}  [UPLOAD] Meta JSON content length: ${metaJson.length}`);
    const meta: DBForgeRaceSubmission['meta'] = JSON.parse(metaJson);
    console.log(`${index}/${total}  [UPLOAD] Parsed meta data, id: ${meta.id}`);

    const address = 'H8WhrngCpCRGkpim4FcRNzbt1BuT4Y9E6xtWf5AGdUem'
    // Create UUID from meta.id + address
    const uuid = createHash('sha256').update(`${meta.id}${address}`).digest('hex');
    console.log(`${index}/${total}  [UPLOAD] Generated submission UUID: ${uuid}`);

    if(uuid != upload.id){
      console.log(`${index} [UPLOAD] - [ERROR] Generated submission UUID: ${uuid} doesn't match original id ${upload.id}`);
    }
    const existingSubmission = await ForgeRaceSubmissionModelFromConnection(db).findById(uuid)
    if(existingSubmission){
      console.log(`${index}/${total} Submission already uploaded`)
      continue;
    }
    console.log(`${index}/${total}  [UPLOAD] Starting S3 upload for ${requiredFiles.length} files`);
    const s3Service = new AWSS3Service(process.env.DO_SPACE_ACCESS_KEY, process.env.DO_SPACE_SECRET_KEY);
    const uploadedFiles = await Promise.all(
      requiredFiles.map(async (file) => {
        const filePath = path.join(uploadPath, file);
        console.log(`${index}/${total}  [UPLOAD] Getting stats for file: ${filePath}`);
        const fileStats = await stat(filePath);
        const fileTimestamp = upload.url.split('/').pop()?.replace('-'+metaFile, '') || "";
        const s3Key = `forge-races/${fileTimestamp}-${file}`;

        if(checkFlag(`${filePath}.uploaded`)) {
          console.log(`${index}/${total}  [UPLOAD] File already uploaded, skipping: ${filePath}`);
          return { file, s3Key, size: fileStats.size };
        }

        console.log(`${index}/${total}  [UPLOAD] Uploading ${file} (${fileStats.size} bytes) to S3 with key: ${s3Key}`);

        createFlag(`${filePath}.uploading`)
        await s3Service.saveItem({
          bucket: process.env.DO_SPACE_TRAINING_BUCKET_NAME,
          file: filePath,
          name: s3Key
        });
        removeFlag(`${filePath}.uploading`)

        createFlag(`${filePath}.uploaded`)
        console.log(`${index}/${total}  [UPLOAD] Successfully uploaded ${file} to S3`);

        return { file, s3Key, size: fileStats.size };
      })
    );
    console.log(`${index}/${total}  [UPLOAD] All files uploaded to S3 successfully`);

    meta.poolId = meta.quest.pool_id;

    if(checkFlag(`${uploadPath}/submission.counted`)) {
      console.log(`${index}/${total}  [UPLOAD] Pool and demonstration counted already`);
    } else {
      // Check pool
      if (meta.poolId) {
        const poolsDb = Models.TrainingPoolModelFromConnection(db)
        const pool = await poolsDb.findById(meta.poolId);
        if (!pool) {
          const token = {
            "type": "TOKEN",
            "symbol": "OMNIS",
            "address": "G6iRK8kN67HJFrPA1CDA5KZaPJMiBu3bqdd9vdKBpump"
          }
          console.log(`${index}/${total}  [UPLOAD] Creating Pool: ${meta.poolId}`);
          await poolsDb.create({
            _id: meta.poolId,
            name: poolName,
            skills: poolName,
            token,
            ownerAddress: address,
            status: TrainingPoolStatus.live,
            demonstrations: 1,
            funds: 0,
            pricePerDemo: 0, // Default to 10 if not provided, minimum of 1
            depositAddress: "N/A",
            depositPrivateKey: "N/A"
          });
        } else {
          console.log(`${index}/${total}  [UPLOAD] Pool found: ${meta.poolId} incrementing submissions`);
          pool.demonstrations += 1
          await pool.save()
        }
      }
      createFlag(`${uploadPath}/submission.counted`)
    }

    if(checkFlag(`${uploadPath}/submission.created`)) {
      console.log(`${index}/${total}  [UPLOAD] Submission already created: ${uuid}`);
    } else {
      const submission = await ForgeRaceSubmissionModelFromConnection(db).create({
        _id: uuid,
        address,
        meta,
        status: ForgeSubmissionProcessingStatus.COMPLETED,
        files: uploadedFiles
      });
      console.log(`${index}/${total}  [UPLOAD] Submission created with ID: ${submission._id}`);
      createFlag(`${uploadPath}/submission.created`)
    }
  }
}

const connectDb = async () => {
  let clientOptions: ConnectOptions = {
    dbName: process.env.DB_NAME
  };
  // Create a Mongoose client with a MongoClientOptions object to set the Stable API version
  const dbCertJson = process.env.DB_CERT
  if(!dbCertJson) {
    throw new Error(
      'DB_CERT Env var not found not found.'
    );
  }
  const dbCert = JSON.parse(dbCertJson);
  const tlsCAFile = path.resolve('./db-cert.pem');
  fs.writeFileSync(tlsCAFile, dbCert.cert, 'utf8');
  // Verify the certificate file exists
  if (!fs.existsSync(tlsCAFile)) {
    throw new Error(
      'TLS CA File not found. '
    );
  }
  clientOptions = {
    tls: true,
    tlsAllowInvalidHostnames: false,
    retryWrites: false,
    tlsCertificateKeyFile: tlsCAFile,
    serverApi: { version: '1', strict: true, deprecationErrors: true },
    ...clientOptions
  };

  const dbURI = process.env.DB_URI;
  if (!dbURI) throw Error('No DB URI passed to connect.');
  await mongoose.connect(dbURI, clientOptions);
  return mongoose.connection;
}

const db = await connectDb()
uploadAll(research, researchBaseDir, db, "Academic Research Navigator" ).then(() => {
  uploadAll(excel, excelBaseDir, db, "Excel Financial Modeling Agent").then(() => {
    console.log(`done`);
  })
});
