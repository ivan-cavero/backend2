import { spawn } from 'bun';

type DbType = 'postgresql' | 'clickhouse';
type Command = 'up' | 'rollback';

interface DbConfig {
  dbNameForLog: string;
  migrationsDir: string;
  requiredEnvVars: string[];
  getDbUrl: () => string | null;
}

const DB_CONFIGS: Record<DbType, DbConfig> = {
  postgresql: {
    dbNameForLog: 'PostgreSQL',
    migrationsDir: 'src/db/migrations/postgresql',
    requiredEnvVars: ['POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_HOST', 'POSTGRES_PORT', 'POSTGRES_DATABASE'],
    getDbUrl: () => {
      const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DATABASE } = process.env;
      if (!POSTGRES_USER || !POSTGRES_PASSWORD || !POSTGRES_HOST || !POSTGRES_PORT || !POSTGRES_DATABASE) {
        return null;
      }
      return `postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DATABASE}?sslmode=disable`;
    },
  },
  clickhouse: {
    dbNameForLog: 'ClickHouse',
    migrationsDir: 'src/db/migrations/clickhouse',
    requiredEnvVars: ['CLICKHOUSE_USER', 'CLICKHOUSE_PASSWORD', 'CLICKHOUSE_HOST', 'CLICKHOUSE_TCP_PORT'],
    getDbUrl: () => {
      const { CLICKHOUSE_USER, CLICKHOUSE_PASSWORD, CLICKHOUSE_HOST, CLICKHOUSE_TCP_PORT, CLICKHOUSE_DATABASE } = process.env;
      if (!CLICKHOUSE_USER || !CLICKHOUSE_PASSWORD || !CLICKHOUSE_HOST || !CLICKHOUSE_TCP_PORT) {
        return null;
      }
      const chHost = (CLICKHOUSE_HOST || '').replace(/^(https?|tcp):\/\//, '');
      return `clickhouse://${CLICKHOUSE_USER}:${CLICKHOUSE_PASSWORD}@${chHost}:${CLICKHOUSE_TCP_PORT}/${CLICKHOUSE_DATABASE || 'default'}`;
    },
  },
};

async function executeDbmateForDb(dbType: DbType, command: Command): Promise<number> {
  const config = DB_CONFIGS[dbType];

  const missingVars = config.requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.error(`Missing one or more ${config.dbNameForLog} environment variables: ${missingVars.join(', ')}`);
    return 1;
  }

  const dbUrl = config.getDbUrl();
  // This check is technically redundant if requiredEnvVars and getDbUrl are in sync,
  // but provides an extra layer of safety.
  if (!dbUrl) {
    console.error(`Failed to construct ${config.dbNameForLog} URL. This might indicate an issue with environment variable checks.`);
    return 1;
  }

  const safeLogUrl = dbUrl.includes('@') ? `${dbUrl.substring(0, dbUrl.indexOf('@') + 1)}...` : dbUrl;
  console.log(`\n--- Running ${config.dbNameForLog} migrations (${command}) ---`);
  console.log(`Using migrations directory: ${config.migrationsDir}`);
  console.log(`Constructed ${config.dbNameForLog} URL (credentials masked): ${safeLogUrl}`);
  console.log(`Executing: bunx dbmate --migrations-dir ${config.migrationsDir} ${command}`);

  const spawnArgs = command === 'up'
    ? ['bunx', 'dbmate', '--no-dump-schema', '--migrations-dir', config.migrationsDir, command]
    : ['bunx', 'dbmate', '--migrations-dir', config.migrationsDir, command];

  const proc = spawn(spawnArgs, {
    env: {
      ...process.env,
      DATABASE_URL: dbUrl,
    },
    stdio: ['inherit', 'inherit', 'inherit'],
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    console.error(`${config.dbNameForLog} migration (${command}) failed with exit code ${exitCode}.`);
  } else {
    console.log(`${config.dbNameForLog} migration (${command}) completed successfully.`);
  }
  return exitCode;
}

async function runDbMate() {
  // Bun automatically loads .env variables into process.env
  const dbTypeArg = process.argv[2] as DbType | 'all' | undefined;
  const commandArg = process.argv[3] as Command | undefined;

  if (!dbTypeArg || !commandArg) {
    // Corrected path based on user's file structure
    console.error('Usage: bun scripts/run-dbmate.ts <postgresql|clickhouse|all> <up|rollback>');
    process.exit(1);
  }

  if (commandArg !== 'up' && commandArg !== 'rollback') {
    console.error(`Invalid command: ${commandArg}. Must be 'up' or 'rollback'.`);
    process.exit(1);
  }

  const dbTypesToProcess: DbType[] = [];
  if (dbTypeArg === 'all') {
    dbTypesToProcess.push('postgresql', 'clickhouse');
  } else if (dbTypeArg === 'postgresql' || dbTypeArg === 'clickhouse') {
    dbTypesToProcess.push(dbTypeArg);
  } else {
    console.error(`Unsupported DB type: ${dbTypeArg}. Must be 'postgresql', 'clickhouse', or 'all'.`);
    process.exit(1);
  }

  if (dbTypesToProcess.length > 1) {
    console.log(`Executing all migrations (${commandArg})...`);
  }

  for (const dbType of dbTypesToProcess) {
    const exitCode = await executeDbmateForDb(dbType, commandArg);
    if (exitCode !== 0) {
      if (dbTypesToProcess.length > 1) { // If it was 'all'
        console.error(`${DB_CONFIGS[dbType].dbNameForLog} migrations failed. Halting further migrations.`);
      }
      process.exit(exitCode); // Exit with the error code of the failed migration
    }
  }

  if (dbTypesToProcess.length > 1) {
    console.log('\nAll migrations executed successfully.');
  }
  process.exit(0); // Success
}

runDbMate().catch(err => {
  console.error('An unexpected error occurred while running the dbmate script:', err);
  process.exit(1);
});
