export interface PollingMarkerV1 {
  version: 1;
  marker: string;
  committedAt: string;
}

export interface PollingOwnerV1 {
  version: 1;
  ownerId: string;
  acquiredAt: string;
  renewedAt: string;
}

export type InboundEventStateV1 =
  | {
      version: 1;
      status: "processing";
      ownerId: string;
      startedAt: string;
    }
  | {
      version: 1;
      status: "completed";
      completedAt: string;
    };

export interface RuntimeIdentityV1 {
  version: 1;
  tokenFingerprint: string;
  botUserId: string;
  verifiedAt: string;
}
