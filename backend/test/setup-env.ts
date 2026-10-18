import { inject } from 'vitest';
import { S3_TEST_KEY, S3_TEST_SECRET } from './global-setup.js';

process.env.DATABASE_URL = inject('databaseUrl');
process.env.S3_ENDPOINT = inject('s3Endpoint');
process.env.S3_REGION = 'us-east-1';
process.env.S3_ACCESS_KEY_ID = S3_TEST_KEY;
process.env.S3_SECRET_ACCESS_KEY = S3_TEST_SECRET;
process.env.S3_BUCKET = 'amigo-test';
