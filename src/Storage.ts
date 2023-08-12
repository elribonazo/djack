import { IPFS } from 'ipfs';

export default async function loadStorage(): Promise<IPFS> {
    const { create } = await import('ipfs');
    return create({
        repo: "./.orbitdb/ipfs",
        start: true,
        EXPERIMENTAL:{
            ipnsPubsub: true
        }
    })
}
