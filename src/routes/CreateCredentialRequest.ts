import  { Request, Response } from 'express';
import { createHash, randomBytes } from 'crypto';
import Cardano from '@minswap/cardano-serialization-lib-nodejs'

import { Credential } from '@hyperledger/anoncreds-nodejs'
import { emailCredentialDefinition, holderDID, issuerDID } from '../Config.js';

export default function CreateCredentialRequest(req: Request, res: Response)  {
    const body = req.body;
    if (!body.email) {
        throw new Error("email not found")
    }
    if (!body.did) {
        throw new Error("did not found")
    }
    if (!body.data) {
        throw new Error("request not found")
    }

    const encryptPassword =  Buffer.from(issuerDID.split(":").at(2)!).toString('hex')
    const decryptHexBody = Cardano.decrypt_with_password(encryptPassword, body.data);
    const decryptBody = JSON.parse(Buffer.from(decryptHexBody, 'hex').toString())
    const decryptRequest = decryptBody.request;
    const decryptOffer = decryptBody.offer;

    const issuedCredential = Credential.create({
        credentialDefinition: emailCredentialDefinition.credentialDefinition,
        credentialDefinitionPrivate: emailCredentialDefinition.credentialDefinitionPrivate,
        credentialOffer: decryptOffer,
        credentialRequest: decryptRequest,
        attributeRawValues: {
            email: `${body.email}@djack.com`,
            id: holderDID
        }
    });

    const salt = createHash('sha256').update(body.email).digest('hex');
    const data = Buffer.from(JSON.stringify(issuedCredential.toJson())).toString('hex');
    const nonce = randomBytes(12).toString('hex');
    const encryptedCredentialIssue = Cardano.encrypt_with_password(
        encryptPassword, 
        salt, 
        nonce, 
        data
    );

    return res.json({credential: encryptedCredentialIssue})
}