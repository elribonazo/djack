import { Schema, CredentialDefinition } from '@hyperledger/anoncreds-nodejs'

import Core from "./Core.js";

const issuerWords = [
    'angle',   'host',    'siren',
    'spare',   'naive',   'absorb',
    'add',     'sunset',  'reopen',
    'afraid',  'pepper',  'injury',
    'heavy',   'deposit', 'knock',
    'valve',   'film',    'good',
    'display', 'race',    'merge',
    'summer',  'photo',   'raven'
];

const holderWords = Core.generateMnemonic();

const holderEntropy = Core.getEntropy(holderWords);
const holderKeyPair = Core.keyPair(holderEntropy);


const issuerEntropy = Core.getEntropy(issuerWords);
const issuerKeyPair = Core.keyPair(issuerEntropy);

export const issuerDID = Core.createDID(issuerKeyPair);
export const holderDID = Core.createDID(holderKeyPair);

export const credentialSchemaId = `${issuerDID}/schemas/email`;
export const credentialDefinitionId = `${issuerDID}/definitions/email`;

export const emailCredentialSchema = Schema.create({
    name: 'test',
    version: '1.0',
    issuerId: issuerDID,
    attributeNames: ['id', 'email'],
});

export const emailCredentialDefinition = CredentialDefinition.create(
    {
        schemaId:credentialSchemaId,
        schema: emailCredentialSchema,
        supportRevocation: false,
        tag: "djack-disposable-email",
        signatureType:"CL",
        issuerId: issuerDID
    }
);

export const port = process.env.PORT || 3000;
export const mailPort = process.env.MAIL_PORT || 456;
