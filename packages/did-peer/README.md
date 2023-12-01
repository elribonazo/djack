# DJACK-SDK DID-Peer
This dependency belongs to the DJACK-SDK, a set of tools that enable peers to establish connections over secure protocols and communicate with eachother in order to share credencials and verify credentials in a peer to peer fancy way.

## Usage
This package is publicly installable from the npm repositories.

Using npm:
```
npm i @djack-sdk/did-peer --save
```

Using yarn:
```
yarn add @djack-sdk/did-peer 
```

## Documentation
This package exposes functions to create ed25519 and x25519 keyPairs which use the [Prism SDK](https://www.npmjs.com/package/@atala/prism-wallet-sdk)

### Cryptography
1. Creating an ed25519 KeyPair

```typescript
import { createEd25519KeyPair } from '@djack-sdk/did-peer';
const keyPair = createEd25519KeyPair();
```

2. Creating an x25519 KeyPair from ed25519 keyPair

```typescript
import { createX25519FromEd25519KeyPair,createEd25519KeyPair } from '@djack-sdk/did-peer';

const ed25519KeyPair = createEd25519KeyPair();
const x25519KeyPair = createX25519FromEd25519KeyPair(ed25519KeyPair);
```

3. Creating an x25519 publicKey from ed25519 publicKey

```typescript
import { createX25519PublicKeyFromEd25519PublicKey,createEd25519KeyPair } from '@djack-sdk/did-peer';

const ed25519KeyPair = createEd25519KeyPair();
const x25519KeyPair = createX25519PublicKeyFromEd25519PublicKey(ed25519KeyPair.publicKey);
```

### DIDFactory
DIDFactor is a component used by the SDK's in order to create stored references and instances of a peerDID.

DIDFactor needs to use a valid storage interface in order for the didKeys to be stored and be retrieveable lateron.

TBD