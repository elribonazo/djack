import loadStorage from './Storage.js';

export default async function loadOrbit() {
  const OrbitDB = (await import('orbit-db')).default;
  const ipfs = await loadStorage();
  const orbitdb = await OrbitDB.createInstance(ipfs, {
      directory: './.orbitdb/keyvalue'
  });
  const db = await orbitdb.kvstore("example", {
      overwrite: true,
      accessController: {
        write: [orbitdb.id]
      }
    });
  return db;
}