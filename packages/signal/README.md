# Djack.email is an opensource decentralised and self sovereign email service.
DJack, previous known as Jackmail was a serverless browser application which was capable of delivering the emails straight to your browser tab without any storage in between. Closing your browser would act as if the email never existed.

## SIGNALING SERVER
The signaling server uses websocket transport to allow the email server and the peers to connect eachother.

In order to run this on your server you'll need to have prepared the following environment variables

```
PORT=8080
pk=[[your pk]]
pu=[[your pub]]
announce=/dns4/[[Your public domain]]/tcp/443/wss/p2p/[[your peer id]]
```

Pull the docker image elribonazo/djack-signaling or run:

```
npx @djack-sdk/signal
```