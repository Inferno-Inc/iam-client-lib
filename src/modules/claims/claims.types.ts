import { utils } from 'ethers';
import {
  VerifiablePresentation,
  StatusList2021Entry,
} from '@ew-did-registry/credentials-interface';
import { ClaimData } from '../did-registry';
import { IMessage } from '../messaging/messaging.types';
import {
  IAppDefinition,
  IOrganizationDefinition,
  IRoleDefinition,
  IRoleDefinitionV2,
  IssuerFields,
} from '@energyweb/credential-governance';

export interface IClaimRequest extends IMessage {
  token: string;
  claimType: string;
  claimTypeVersion: string;
  registrationTypes: RegistrationTypes[];
  subjectAgreement?: string;
}

export interface IClaimIssuance extends IMessage {
  // issuedToken is is only provided in the case of off-chain role
  issuedToken?: string;
  // onChainProof is only provided in case of on-chain role
  onChainProof?: string;
  claimType?: string;
  claimTypeVersion?: string;
  acceptedBy: string;
  vp?: string;
  // a Unix timestamp expressed in milliseconds of when the claim expires
  expirationTimestamp?: number;
}

export interface IClaimRejection extends IMessage {
  isRejected: boolean;
  rejectionReason?: string;
}

export enum RegistrationTypes {
  OffChain = 'RegistrationTypes::OffChain',
  OnChain = 'RegistrationTypes::OnChain',
}

export enum ClaimEventType {
  ISSUE_CREDENTIAL = 'issue-credential',
  REJECT_CREDENTIAL = 'reject-credential',
  REQUEST_CREDENTIALS = 'request-credential',
}

export interface Claim {
  id: string;
  requester: string;
  subject: string;
  claimIssuer: string[];
  claimType: string;
  claimTypeVersion: string;
  registrationTypes: RegistrationTypes[];
  token: string;
  subjectAgreement?: string;
  onChainProof?: string;
  issuedToken?: string;
  isAccepted: boolean;
  acceptedBy?: string;
  isRejected?: boolean;
  namespace: string;
  createdAt: string;
  redirectUri?: string;
  vp?: VerifiablePresentation;
  expirationTimestamp?: string;
}

export const readyToBeRegisteredOnchain = (
  claim: unknown
): claim is Required<
  Pick<
    Claim,
    'claimType' | 'claimTypeVersion' | 'subject' | 'onChainProof' | 'acceptedBy'
  > & { expirationTimestamp?: number; subjectAgreement?: string }
> => {
  if (!claim) return false;
  if (typeof claim !== 'object') return false;
  const requiredProps = [
    'claimType',
    'claimTypeVersion',
    'subject',
    'onChainProof',
    'acceptedBy',
  ];
  const claimProps = Object.keys(claim);

  return requiredProps.every((p) => claimProps.includes(p));
};

export const typedMsgPrefix = '1901';
export const erc712_type_hash = utils.id(
  'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'
);
export const agreement_type_hash = utils.id(
  'Agreement(address subject,bytes32 role,uint256 version)'
);
export const proof_type_hash = utils.id(
  'Proof(address subject,bytes32 role,uint256 version,uint256 expiry,address issuer)'
);
export const eternityTimestamp = Number.MAX_SAFE_INTEGER - 1; // constraint of ethers.BigNumber

export type RequestClaim = { requester: string; message: IClaimRequest };
export type IssueClaim = { issuer: string; message: IClaimIssuance };
export type RejectClaim = { issuer: string; message: IClaimRejection };

export interface GetClaimsByRequesterOptions {
  /** DID of the requestor */
  did: string;

  /** Indicates whether to show only accepted `Claims`  */
  isAccepted?: boolean;

  /** Indicates what namespace `Claims` should be in  */
  namespace?: string;
}

export interface GetClaimsByIssuerOptions {
  /** DID of the issuer */
  did: string;

  /** Indicates whether to show only accepted `Claims` */
  isAccepted?: boolean;

  /** Indicates what namespace `Claims` should be in */
  namespace?: string;
}

export interface GetClaimsBySubjectOptions {
  /** DID of the subject */
  did: string;

  /** Indicates whether to show only accepted `Claims` */
  isAccepted?: boolean;

  /** Indicates what namespace `Claims` should be in */
  namespace?: string;
}

export interface GetClaimsByRevokerOptions {
  /** DID of the subject */
  did: string;

  /** Indicates what namespace `Claims` should be in */
  namespace?: string;
}

export interface CreateClaimRequestOptions {
  /** Claim request params */
  claim: ClaimData;

  /** DID of the subject */
  subject?: string;

  /** Indicates what type of claim registration you are requesting: on-chain and/or off-chain */
  registrationTypes?: RegistrationTypes[];
}

export interface IssueClaimRequestOptions {
  /** DID of the claim requestor */
  requester: string;

  /** JWT token generated by requestor during claim request */
  token: string;

  /** Claim id */
  id: string;

  /** Subject agreement signature */
  subjectAgreement?: string;

  /** Registration types */
  registrationTypes: RegistrationTypes[];

  /** Issuer fields that role is requiring */
  issuerFields?: IssuerFields[];

  /** Indicates whether to publish role on-chain or not (default: false) */
  publishOnChain?: boolean;

  /*
   * Indicates credential status (such as revocation status)
   * https://w3c-ccg.github.io/vc-status-list-2021/#statuslist2021entry
   */
  credentialStatusOverride?: StatusList2021Entry;

  /** A Unix timestamp expressed in milliseconds of when the claim expires. */
  expirationTimestamp?: number;
}

export interface RegisterOnchainOptions {
  /** Role namespace */
  claimType?: string;

  /** Version of the claim type */
  claimTypeVersion?: string;

  /** @deprecated */
  token?: string;

  /** Subject agreement signature */
  subjectAgreement?: string;

  /** On-chain proof signature */
  onChainProof: string;

  /** DID of the issuer */
  acceptedBy: string;

  /** DID of the claim subject */
  subject?: string;

  /** A Unix timestamp expressed in seconds of when the claim expires. */
  expirationTimestamp?: number;
}

export interface RejectClaimRequestOptions {
  /** Claim id */
  id: string;

  /** DID of the claim requestor */
  requesterDID: string;

  /** Reason for rejection */
  rejectionReason?: string;
}

export interface DeleteClaimOptions {
  /** Claim id */
  id: string;
}

export interface IssueClaimOptions {
  /** DID of the claim subject */
  subject: string;

  /** Registration types */
  registrationTypes?: RegistrationTypes[];

  /** Claim params */
  claim: {
    /** Role namespace */
    claimType: string;

    /** Version of the role */
    claimTypeVersion: number;

    /** Issuers fields that role is requiring */
    issuerFields?: IssuerFields[];
  };

  /*
   * Indicates credential status (such as revocation status)
   * https://w3c-ccg.github.io/vc-status-list-2021/#statuslist2021entry
   */
  credentialStatusOverride?: StatusList2021Entry;

  /** A Unix timestamp expressed in milliseconds of when the claim expires. */
  expirationTimestamp?: number;
}

export interface PublishPublicClaimOptions {
  /** @deprecated */
  token?: string;

  /** Registration types */
  registrationTypes?: RegistrationTypes[];

  /** Claim params */
  claim: {
    /** JWT token generated by requestor during claim request */
    token?: string;

    /** Role namespace */
    claimType?: string;
  };
}

export interface CreateSelfSignedClaimOptions {
  /** Claim data */
  data: Record<string, unknown>;

  /** DID of the claim subject */
  subject?: string;
}

export interface GetUserClaimsOptions {
  /** DID of the subject */
  did?: string;
}

export interface VerifyEnrolmentPrerequisitesOptions {
  /** DID of the subject */
  subject: string;

  /** Role claim type */
  role: string;

  /** Role definition */
  roleDefinition?:
    | IRoleDefinition
    | IRoleDefinitionV2
    | IAppDefinition
    | IOrganizationDefinition;
}

export interface IssueVerifiablePresentationOptions {
  /** DID of the subject */
  subject: string;

  /** Role claim type */
  namespace: string;

  /** Role version */
  version: string;

  /** Issuers fields that role is requiring */
  issuerFields?: IssuerFields[];

  /*
   * Indicates credential status (such as revocation status)
   * https://w3c-ccg.github.io/vc-status-list-2021/#statuslist2021entry
   */
  credentialStatus?: StatusList2021Entry;

  /** A Unix timestamp expressed in milliseconds of when the claim expires. */
  expirationTimestamp?: number;
}

export interface ApproveRolePublishingOptions {
  /** DID of the subject */
  subject: string;

  /** Role claim type */
  role: string;

  /** Role version */
  version: number;
}

export interface RevokeClaimOptions {
  /** Claim id */
  claimId?: string;

  claim?: {
    /** Claim type namespace */
    namespace: string;

    /** Subject of the claim */
    subject: string;
  };
}

export interface RevokeMultipleClaimOptions {
  /** Claim id */
  claimIds?: string[];

  claims?: {
    /** Claim type namespace */
    namespace: string;

    /** Subject of the claim */
    subject: string;
  }[];
}

export interface IsClaimRevokedOptions {
  /** Claim id */
  claimId?: string;

  claim?: {
    /** Claim type namespace */
    namespace: string;

    /** Subject of the claim */
    subject: string;
  };
}

export interface ClaimRevocationDetailsOptions {
  /** Claim id */
  claimId?: string;

  claim?: {
    /** Claim type namespace */
    namespace: string;

    /** Subject of the claim */
    subject: string;
  };
}

export interface GetRevocationClaimDetailsOptions {
  /** Claim id */
  claimId?: string;

  claim?: {
    /** Claim type namespace */
    namespace: string;

    /** Subject of the claim */
    subject: string;
  };
}

export interface GetRevocationClaimDetailsResult {
  namespace: string;
  subject: string;
}

export interface ClaimRevocationDetailsResult {
  revoker: string;
  timestamp: number;
}

export interface CredentialVerificationResult {
  /** Indicates if a claim has been successfully verified */
  isVerified: boolean;

  /** Verification errors */
  errors: string[];
}
