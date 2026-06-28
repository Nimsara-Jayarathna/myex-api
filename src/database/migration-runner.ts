import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose, { type Connection } from 'mongoose';

export interface Migration {
  id: string;
  up(connection: Connection): Promise<void>;
  down(connection: Connection): Promise<void>;
}

const migrationDir = path.join(__dirname, 'migrations');
const uri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/blipzo';

async function loadMigrations(): Promise<Migration[]> {
  const files = (await fs.readdir(migrationDir))
    .filter((file) => file.endsWith('.ts') || file.endsWith('.js'))
    .filter((file) => !file.endsWith('.d.ts'))
    .sort();

  const migrations: Migration[] = [];
  for (const file of files) {
    const mod = (await import(path.join(migrationDir, file))) as {
      default?: Migration;
      migration?: Migration;
    };
    const migration = mod.default ?? mod.migration;
    if (migration) migrations.push(migration);
  }
  return migrations;
}

async function ensureCollection(connection: Connection) {
  return connection.collection('schema_migrations');
}

async function up(connection: Connection): Promise<void> {
  const collection = await ensureCollection(connection);
  const applied = await collection.find({}).toArray();
  const appliedIds = new Set(applied.map((doc) => doc.id));
  for (const migration of await loadMigrations()) {
    if (appliedIds.has(migration.id)) continue;
    await migration.up(connection);
    await collection.insertOne({ id: migration.id, appliedAt: new Date() });
    console.log(`Applied ${migration.id}`);
  }
}

async function down(connection: Connection): Promise<void> {
  const collection = await ensureCollection(connection);
  const last = await collection.find({}).sort({ appliedAt: -1 }).limit(1).next();
  if (!last?.id) {
    console.log('No migration to roll back.');
    return;
  }
  const migration = (await loadMigrations()).find((item) => item.id === last.id);
  if (!migration) throw new Error(`Migration file not found for ${last.id}`);
  await migration.down(connection);
  await collection.deleteOne({ id: last.id });
  console.log(`Rolled back ${last.id}`);
}

async function status(connection: Connection): Promise<void> {
  const collection = await ensureCollection(connection);
  const applied = await collection.find({}).sort({ id: 1 }).toArray();
  console.table(applied.map((doc) => ({ id: doc.id, appliedAt: doc.appliedAt })));
}

async function create(): Promise<void> {
  const name = process.argv[3] ?? 'new-migration';
  const stamp = new Date()
    .toISOString()
    .replace(/[-:T.Z]/g, '')
    .slice(0, 14);
  const id = `${stamp}-${name}`;
  const filePath = path.join(migrationDir, `${id}.ts`);
  await fs.writeFile(
    filePath,
    `import type { Connection } from 'mongoose';

export default {
  id: '${id}',
  async up(connection: Connection): Promise<void> {
    // TODO
  },
  async down(connection: Connection): Promise<void> {
    // TODO
  },
};
`,
  );
  console.log(`Created ${filePath}`);
}

async function main(): Promise<void> {
  const command = process.argv[2];
  if (command === 'create') {
    await create();
    return;
  }
  await mongoose.connect(uri);
  try {
    if (command === 'up') await up(mongoose.connection);
    else if (command === 'down') await down(mongoose.connection);
    else if (command === 'status') await status(mongoose.connection);
    else throw new Error('Use create, up, down, or status');
  } finally {
    await mongoose.disconnect();
  }
}

void main();
