const {spawn} = require('child_process');
const assert = require('assert');

assert(!!process.env.PGPASSFILE, 'Expected PGPASSFILE environment variable.');
let backupDir = process.env.E2E_DB_DIR;
assert(!!backupDir, 'Expected E2E_DB_DIR environment variable.');

let args = [
  '--host=localhost',
  '--dbname=tv_e2e',
  '--username=postgres',
  '--clean',
  '--format=custom',
  '--verbose',
  backupDir + '\\owned_shows.dump'
];

const child = spawn('pg_restore', args, {
  stdio: 'inherit'
});

child.on('exit', code => {
  console.log(`Exit code is: ${code}`);
});
