import type { DIDDoc } from "didcomm-node";
import { DIDResolutionOptions, DIDResolutionResult } from "did-resolver";
import { Domain } from '@atala/prism-wallet-sdk';


type ResolverFN = (didUrl: string, options?: DIDResolutionOptions) => Promise<DIDResolutionResult>;
type PeerDIDResolverFN = (did: Domain.DID) => DIDDoc;


export function didUrlFromString(didString: string) {
    const regex =
        /^did:(?<method>[a-z0-9]+(:[a-z0-9]+)*):(?<idstring>[^#?/]*)(?<path>[^#?]*)?(?<query>\?[^#]*)?(?<fragment>#.*)?$/gi;
    const match = regex.exec(didString);
    if (!match || !match.groups) {
        throw new Error("Invalid did string");
    }
    const { method, idstring, fragment = "", query = "", path } = match.groups;
    let attributes = new Map();
    if (query) {
        attributes = query
            .slice(1)
            .split("&")
            .map((queryAttribute) => queryAttribute.split("="))
            .reduce((all, [varName, varValue]) => {
                all.set(varName, varValue);
                return all;
            }, new Map());
    }

    const did = Domain.DID.fromString(`did:${method}:${idstring}`);
    const paths = path ? path.split("/").filter((p) => p) : [];
    return new Domain.DIDUrl(did, paths, attributes, fragment.slice(1));
}


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
        const relayResolvedPeerDID = await peerDidResolver(Domain.DID.fromString(relayPeerDID));
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