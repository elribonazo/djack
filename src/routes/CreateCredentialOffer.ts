import  { Request, Response } from 'express';
import { createHash, randomBytes } from 'crypto';
import Cardano from '@minswap/cardano-serialization-lib-nodejs'

import { CredentialOffer } from '@hyperledger/anoncreds-nodejs'
import { credentialDefinitionId, credentialSchemaId, emailCredentialDefinition } from '../Config.js';

export default function CreateCredentialOffer(req: Request, res: Response)  {
    const body = req.body;
    if (!body.email) {
        throw new Error("email not found")
    }
    if (!body.did) {
        throw new Error("did not found")
    }
    const emailCredentialOffer = CredentialOffer.create({
        schemaId: credentialSchemaId,
        credentialDefinitionId: credentialDefinitionId,
        keyCorrectnessProof: emailCredentialDefinition.keyCorrectnessProof.toJson()
    });
    const salt = createHash('sha256').update(body.email).digest('hex');
    const data = Buffer.from(JSON.stringify(emailCredentialOffer.toJson())).toString('hex');
    const nonce = randomBytes(12).toString('hex');
    const encryptPassword = Buffer.from(body.did.split(":").at(2)!).toString('hex')
    const encryptedCredentialOffer = Cardano.encrypt_with_password(
        encryptPassword, 
        salt, 
        nonce, 
        data
    );
    return res.json({
        credentialOffer: encryptedCredentialOffer,
    });
}