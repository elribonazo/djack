# Djack.email is an opensource decentralised and self sovereign email service.
DJack, previous known as Jackmail was a serverless browser application which was capable of delivering the emails straight to your browser tab without any storage in between. Closing your browser would act as if the email never existed.

## SIGNALING SERVER
The signaling server uses websocket transport to allow the email server and the peers to connect eachother.

In order to run this on your server you'll need to have prepared the following environment variables

| Name          | Description             | Default Value |
|---------------|-------------------------|---------------|
| PORT | Default Http/https Port | 8080 |
| HOST | hostname or ip address | 0.0.0.0 |
| PUBLIC_DOMAIN | public domain where the signaling server is exposed | localhost |
| pk | Ed25519PrivateKey in raw bytes in hex | . | 
| pu | Ed25519PublicKey in raw bytes in hex | . | 
| announce | The Peer to Peer address to adversite other peers | /dns4/domain/wss/443/peerID |
| FILTER | Filter only DNS secure websockets peers or allow all | all |
| CORS | list of domains to allow api calls from, split by comma. NODE_ENV = "development" will enable any domain in cors, but in production its mandatory to enter one or multiple domains, or "*" | none |

```
docker pull elribonazo/djack-signaling
```

On in Nodejs run the following command

```
npx @djack-sdk/signal
```