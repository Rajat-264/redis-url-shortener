# 🔗 Redis URL Shortener

A fast, distributed URL shortener service using Redis sharding and Node.js.

## Features
- Shorten long URLs with custom TTL (expiration time)
- Automatic redirection to original URLs
- **Distributed Redis backend with consistent hashing sharding**
- Simple REST API
- Zero-downtime scaling through key-based sharding

## Prerequisites
- Node.js v18+
- **Redis 3+ instances** (for sharding setup)
- npm/yarn
