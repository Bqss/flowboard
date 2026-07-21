---
trigger: Adding a new resource (e.g. products, posts, comments) — full stack from types to UI
---

# CRUD Pattern: Schema → Handlers → Routes → Page

## When to use

When adding a new resource. The pattern is linear and 1:1.

## The Stack

```
1. app/db/schema.ts          → export const products = pgTable(...)
2. app/handlers/products.ts  → listProducts, createProduct
3. routes/products.ts        → api.group('/products', ...)
4. app/pages/products/+page.svelte → Svelte 5 frontend
```

## Pattern

### 1. Schema (Drizzle)

```typescript
// app/db/schema.ts
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const products = pgTable('products', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

Run `bun run db:generate` and `bun run db:migrate`.

### 2. Handlers

```typescript
// app/handlers/products.ts
import { db } from '@db';
import { products } from '@db/schema';

export const listProducts = async () => {
  return await db.select().from(products);
};

export const createProduct = async ({ body }: { body: { name: string } }) => {
  const [product] = await db.insert(products).values(body).returning();
  return product;
};
```

### 3. Routes (Elysia)

```typescript
// routes/api.ts (or a separate routes/products.ts)
import { Elysia, t } from 'elysia';
import * as products from '@handlers/products';

export const productsRoutes = new Elysia({ prefix: '/products' })
  .get('/', products.listProducts)
  .post('/', products.createProduct, {
    body: t.Object({
      name: t.String()
    })
  });
```

### 4. Page (Svelte 5)

```svelte
<!-- app/pages/products/+page.svelte -->
<script lang="ts">
  let products = $state([]);
  
  $effect(() => {
    fetch('/api/products').then(res => res.json()).then(data => products = data);
  });
</script>

<h1>Products</h1>
<ul>
  {#each products as product}
    <li>{product.name}</li>
  {/each}
</ul>
```
