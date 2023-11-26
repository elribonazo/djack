import type { DIDDoc } from "didcomm-node";
import { DIDResolutionOptions, DIDResolutionResult } from "did-resolver";
import { DID } from '@djack-sdk/interfaces';


type ResolverFN = (didUrl: string, options?: DIDResolutionOptions) => Promise<DIDResolutionResult>;
type PeerDIDResolverFN = (did: DID) => DIDDoc;

export async function resolveRelayAddressFromDIDWEB(didWeb: string, didWebResolver: ResolverFN, peerDidResolver: PeerDIDResolverFN): Promise<string> {
    const resolved = await didWebResolver(didWeb);
    if (resolved && resolved.didDocument) {
        const requiredService = resolved.didDocument.service?.find((service: any) => service.type === "DIDCommMessaging" && service.serviceEndpoint.accept.includes("didcomm/v2"));
        if (!requiredService) {
            throw new Error(`Invalid did:web (${didWeb}), does not accept didcomm/v2 DIDCommMessaging required service.`)
        }
        const serviceEndpoint = requiredService.serviceEndpoint;
        if (Array.isArray(serviceEndpoint)) {
            throw new Error(`Invalid did:web (${didWeb}), has an invalid serviceEndpoint.`)
        }
        if (typeof serviceEndpoint === "string") {
            throw new Error(`Invalid did:web (${didWeb}), has an invalid serviceEndpoint.`)
        }
        const relayPeerDID = serviceEndpoint.uri;
        const relayResolvedPeerDID = await peerDidResolver(DID.fromString(relayPeerDID));
        const relayAddress = relayResolvedPeerDID.service.find((service) => service.type === "DIDCommMessaging" && service.serviceEndpoint.accept.includes("didcomm/v2"))?.serviceEndpoint.uri as string;
        if (!relayAddress) {
            throw new Error(`Invalid did:web (${didWeb}), does not accept didcomm/v2 DIDCommMessaging required service.`)
        }
        return relayAddress
    }
    throw new Error(`Invalid did:web (${didWeb}), could not resolve.`)
}

export * from "./storage";
export * from "./storage/stores/InMemory";