import { v4 as uuidv4 } from "uuid";
import { base64 } from "multiformats/bases/base64";
export interface AttachmentHeader {
  children: string;
}

export interface AttachmentJws {
  header: AttachmentHeader;
  protectedStr: string;
  signature: string;
}

export interface AttachmentJwsData {
  base64: string;
  jws: AttachmentJws;
}

export interface AttachmentBase64 {
  base64: string;
}

export interface AttachmentLinkData {
  links: string[];
  hash: string;
}

export interface AttachmentJsonData {
  data: string;
}

export type AttachmentData =
  | AttachmentJsonData
  | AttachmentLinkData
  | AttachmentBase64
  | AttachmentJwsData
  | AttachmentJws
  | AttachmentHeader;

export class AttachmentDescriptor {
  constructor(
    public readonly data: AttachmentData,
    public readonly mediaType?: string,
    public readonly id: string = uuidv4(),
    public readonly filename?: Array<string>,
    public readonly format?: string,
    public readonly lastModTime?: string,
    public readonly byteCount?: number,
    public readonly description?: string
  ) {}

  static build<T>(
    payload: T,
    id: string = uuidv4(),
    mediaType = "application/json"
  ): AttachmentDescriptor {
    const encoded = base64.baseEncode(Buffer.from(JSON.stringify(payload)));
    const attachment: AttachmentBase64 = {
      base64: encoded,
    };
    return new AttachmentDescriptor(attachment, mediaType, id);
  }
}
