# Gunakan Bun image resmi
FROM oven/bun:1 as base
WORKDIR /app

# Install dependencies terlebih dahulu (untuk caching layer docker)
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Copy semua file source code
COPY . .

# Build aplikasi SvelteKit
RUN bun run build

# Set environment ke production
ENV NODE_ENV=production

# Jalankan server
CMD ["bun", "run", "start"]
