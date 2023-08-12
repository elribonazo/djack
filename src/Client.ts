import axios from 'axios';

import Cardano from '@minswap/cardano-serialization-lib-nodejs'
import { createHash, randomBytes } from 'crypto';
import {  CredentialDefinition, CredentialOffer, CredentialRequest, Credential } from '@hyperledger/anoncreds-nodejs'

export async function requestCredentialOffer(account: string, did: string): Promise<CredentialOffer> {
    const response = await axios.post('http://localhost:3000/credentials/offer', JSON.stringify({"email":account,"did":did}), {headers: { 
      'Content-Type': 'application/json'
    }});
    const encryptPassword = Buffer.from(did.split(":").at(2)!).toString('hex')
    const decryptHexOffer = Cardano.decrypt_with_password(encryptPassword, response.data.credentialOffer);
    const decryptOffer = JSON.parse(Buffer.from(decryptHexOffer, 'hex').toString())
    return CredentialOffer.fromJson(decryptOffer)
}

export async function acceptCredentialOffer(account: string, offer: CredentialOffer, linkSecret: string, linkSecretName: string, credentialDefinition: CredentialDefinition, did: string) {
    const jsonOffer = offer.toJson();
    const emailCredentialRequest = CredentialRequest.create({
        entropy: jsonOffer.nonce as string,
        credentialDefinition: credentialDefinition,
        linkSecret: linkSecret,
        linkSecretId: linkSecretName,
        credentialOffer: offer
    });

    const credentialRequestJson = emailCredentialRequest.credentialRequest.toJson();
    const credentialMetadataJson = emailCredentialRequest.credentialRequestMetadata.toJson();
    const encryptPassword = Buffer.from(did.split(":").at(2)!).toString('hex')
    const salt = createHash('sha256').update(account).digest('hex');
    const body = Buffer.from(JSON.stringify({request: credentialRequestJson, offer: offer.toJson()})).toString('hex');
    const nonce = randomBytes(12).toString('hex');

    const encryptedCredentialRequest = Cardano.encrypt_with_password(
        encryptPassword,
        salt,
        nonce,
        body
    )

    const response = await axios.post('http://localhost:3000/credentials/request', JSON.stringify({"email":account,"did":did, data: encryptedCredentialRequest }), {headers: { 
      'Content-Type': 'application/json'
    }});

    const decryptHexCredential = Cardano.decrypt_with_password(encryptPassword, response.data.credential);

    return {
        issuedCredential: Credential.fromJson(JSON.parse(Buffer.from(decryptHexCredential, 'hex').toString())),
        credentialMetadataJson
    }
}