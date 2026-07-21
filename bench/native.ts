// Native Elysia via Bun.serve — the SAME api instance, no SvelteKit pipeline.
import { api } from '../routes/api';

api.listen(Number(process.env.PORT) || 4001);
console.log(`native elysia on ${process.env.PORT || 4001}`);
