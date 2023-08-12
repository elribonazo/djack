import express, { Express } from 'express';
import { LinkSecret, Presentation, PresentationRequest } from '@hyperledger/anoncreds-nodejs'
import loadOrbit from './OrbitDB.js';
import { credentialDefinitionId, credentialSchemaId, emailCredentialDefinition, emailCredentialSchema, holderDID, issuerDID, port } from 'Config.js';
import CreateCredentialOffer from 'routes/CreateCredentialOffer.js';
import CreateCredentialRequest from 'routes/CreateCredentialRequest.js';
import { requestCredentialOffer, acceptCredentialOffer } from './Client.js';

const app: Express =  express();

(async () => {

    try {
        const OrbitDB = await loadOrbit();
        await OrbitDB.load();

        app.use(express.json());
        app.post('/credentials/offer', CreateCredentialOffer);
        app.post('/credentials/request', CreateCredentialRequest);
    
        app.listen(port, async () => {
            console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
            /**
             * Start Flow
             */
            const account = "elribonazo";
            const linkSecret = LinkSecret.create()
            const linkSecretName = account;

            const credentialOffer = await requestCredentialOffer(account, holderDID);
            const { 
                credentialMetadataJson, 
                issuedCredential 
            } = await acceptCredentialOffer(
                account, 
                credentialOffer, 
                linkSecret, 
                linkSecretName, 
                emailCredentialDefinition.credentialDefinition, 
                issuerDID
            );
            
            const credential = issuedCredential.process({
                credentialRequestMetadata: credentialMetadataJson,
                linkSecret:linkSecret,
                credentialDefinition: emailCredentialDefinition.credentialDefinition
            })

            const presentationRequest = PresentationRequest.fromJson({
                name:"elribonazo@djack.com",
                version: "1.0",
                nonce: LinkSecret.create(),
                requested_attributes: {
                    email: {
                        name:'email',
                        names:['email','Email', 'Email Address'],
                        restrictions: [
                            {
                                "issuer_did": issuerDID,
                                "schema_id": credentialSchemaId
                              },
                              {
                                "cred_def_id" : credentialDefinitionId,
                                "attr::email::value" : "elribonazo@djack.com"
                              }
                        ]
                    }
                }
            })

            const presentation = Presentation.create({
                presentationRequest: presentationRequest,
                credentials: [
                    {
                        credential: credential
                    }
                ],
                credentialsProve:[
                    {
                        entryIndex:0,
                        referent: 'email',
                        isPredicate: false,
                        reveal: false
                    }
                ],
                selfAttest: { },
                linkSecret: linkSecret,
                schemas: {
                    [credentialSchemaId]: emailCredentialSchema
                },
                credentialDefinitions: {
                    [credentialDefinitionId]: emailCredentialDefinition.credentialDefinition
                }
            })
            
            const result = presentation.verify({
                presentationRequest: presentationRequest,
                schemas: {
                    [credentialSchemaId]: emailCredentialSchema
                },
                credentialDefinitions: {
                    [credentialDefinitionId]: emailCredentialDefinition.credentialDefinition
                }
            })

            console.log(`${account}@djack.com has been authenticated & verified ${result ? 'YESSSSSS!!!': 'NO'}`)
            debugger;
        });

       
    } catch (err) {
        console.log("err", err)
        process.exit(1);
    }
})()