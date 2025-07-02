import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import mongoose, { ConnectOptions } from 'mongoose';
import { catchErrors } from './hooks/errors.ts';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import fs from 'fs';

dotenv.config();

const app = express();
const port = 8001;

// Create HTTP server
const httpServer = createServer(app);

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(bodyParser.json({ limit: '15gb' }));
app.use(express.json({ limit: '15gb' }));
app.use(express.urlencoded({ limit: '15gb' }));
// Add headers
app.use(function (req, res, next) {
  // Origin to allow
  const allowedOrigins = [
    'tauri://localhost',
    'http://tauri.localhost',
    'http://localhost:1420',
    'http://localhost:5173',
    'http://localhost:8001',
    'http://18.157.122.205',
    'https://omniminds.ai'
  ];

  const origin = req.headers.origin || '';
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  // Request methods
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  // Request headers
  res.setHeader('Access-Control-Expose-Headers', 'auth-token, x-forwarded-for');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-Requested-With,content-type,auth-token,cancelToken,responsetype,x-forwarded-for,x-wallet-address,x-connect-token,content-length'
  );
  next();
});

app.disable('x-powered-by');
app.set('trust proxy', true);

import { settingsApi } from './api/settings.ts';
app.use('/v1/settings', settingsApi);
//
import { walletApi } from './api/wallet.ts';
app.use('/v1/wallet', walletApi);


// import { arena } from './api/gym.ts';
// import { launchBayApi } from './api/forge/index.ts';
// import { trainingUploadApi } from './api/forge-upload.ts';

import { gymApi } from './api/gym.ts';
import { forgeApi } from './api/forge/index.ts';
import { forgeUploadApi } from './api/forge-upload.ts';


app.use('/v1/gym', gymApi);
app.use('/v1/forge', forgeApi);
app.use('/v1/forge/upload', forgeUploadApi);

//
// error handling
import { errorHandler } from './middleware/errorHandler.ts';
app.use(errorHandler);

//Utility HC
app.get( "/hc",
  (_, res) => {res.send("Omniminds Backend is healthy and kicking")})

catchErrors();

async function connectToDatabase() {
  // Production configuration
  try {
    let clientOptions: ConnectOptions = {
      dbName: process.env.DB_NAME
    };
    if (true || process.env.NODE_ENV === 'production') {
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
    }
    const dbURI = process.env.DB_URI;
    if (!dbURI) throw Error('No DB URI passed to connect.');
    await mongoose.connect(dbURI, clientOptions);
    await mongoose.connection.db?.admin().command({ ping: 1 });
    console.log('Database connected!');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
    await mongoose.disconnect()
  }
}

httpServer.listen(port, async () => {
  console.log(`Omniminds backend listening on port ${port}`);
  await connectToDatabase().catch(console.dir);
  // refresh pool status
  // startRefreshInterval();
});
