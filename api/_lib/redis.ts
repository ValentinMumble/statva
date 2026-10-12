import {Redis} from '@upstash/redis';
import {env} from './env.js';

let client: Redis | null = null;

const redis = (): Redis => (client ??= new Redis({url: env('KV_REST_API_URL'), token: env('KV_REST_API_TOKEN')}));

export {redis};
