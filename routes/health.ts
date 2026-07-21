import { Elysia } from 'elysia';
import * as health from '@handlers/health';

/** Health/liveness route table. */
export const healthRoutes = new Elysia({ prefix: '/health' }).get('/', health.check);
