import {
  IAppDefinition,
  IOrganizationDefinition,
  IRoleDefinition,
} from '@energyweb/credential-governance';
import { IDIDDocument } from '@ew-did-registry/did-resolver-interface';
import {
  IClaimIssuance,
  IClaimRejection,
  IClaimRequest,
} from '../claims/claims.types';
import { IPubKeyAndIdentityToken } from '../signer/signer.types';
import { AssetsFilter, ClaimsFilter } from './cache-client.types';
import { Asset, AssetHistory } from '../assets/assets.types';
import { IApp, IOrganization, IRole } from '../domains/domains.types';
import { Claim } from '../claims/claims.types';
import { SearchType } from '.';

export interface ICacheClient {
  pubKeyAndIdentityToken: IPubKeyAndIdentityToken | undefined;
  login: () => Promise<void>;
  isAuthEnabled: () => boolean;
  getRoleDefinition: (namespace: string) => Promise<IRoleDefinition>;
  getRolesDefinition: (
    namespace: string[]
  ) => Promise<Record<string, IRoleDefinition>>;
  getRolesByRevoker: (revoker: string) => Promise<IRole[]>;
  getOrgDefinition: (namespace: string) => Promise<IOrganizationDefinition>;
  getAppDefinition: (namespace: string) => Promise<IAppDefinition>;
  getApplicationRoles: (namespace: string) => Promise<IRole[]>;
  getOrganizationRoles: (namespace: string) => Promise<IRole[]>;
  getOrganizationsByOwner: (
    owner: string,
    excludeSubOrgs?: boolean
  ) => Promise<IOrganization[]>;
  getApplicationsByOwner: (owner: string) => Promise<IApp[]>;
  getApplicationsByOrganization: (namespace: string) => Promise<IApp[]>;
  getSubOrganizationsByOrganization: (
    namespace: string
  ) => Promise<IOrganization[]>;
  getOrgHierarchy: (namespace: string) => Promise<IOrganization>;
  getNamespaceBySearchPhrase: (
    phrase: string,
    types?: SearchType[]
  ) => Promise<(IOrganization | IApp | IRole)[]>;
  getRolesByOwner: (owner: string) => Promise<IRole[]>;
  getDIDsForRole: (namespace: string) => Promise<string[]>;

  getClaimsBySubjects: (subjects: string[]) => Promise<Claim[]>;
  getClaimsByIssuer: (
    issuer: string,
    filter?: ClaimsFilter
  ) => Promise<Claim[]>;
  getClaimsByRequester: (
    requester: string,
    filter?: ClaimsFilter
  ) => Promise<Claim[]>;
  getClaimsBySubject: (
    subject: string,
    filter?: ClaimsFilter
  ) => Promise<Claim[]>;
  getClaimById: (claimId: string) => Promise<Claim | undefined>;
  getClaimsByRevoker: (
    revoker: string,
    filter?: ClaimsFilter
  ) => Promise<Claim[]>;
  requestClaim: (message: IClaimRequest) => Promise<void>;
  issueClaim: (issuer: string, message: IClaimIssuance) => Promise<void>;
  rejectClaim: (issuer: string, message: IClaimRejection) => Promise<void>;
  deleteClaim: (claimId: string) => Promise<void>;

  getDidDocument: (
    did: string,
    includeClaims?: boolean
  ) => Promise<IDIDDocument>;
  addDIDToWatchList: (did: string) => Promise<void>;

  getOwnedAssets: (owner: string) => Promise<Asset[]>;
  getOfferedAssets: (offeredTo: string) => Promise<Asset[]>;
  getAssetById: (id: string) => Promise<Asset>;
  getPreviouslyOwnedAssets: (owner: string) => Promise<Asset[]>;
  getAssetHistory: (
    id: string,
    filter?: AssetsFilter
  ) => Promise<AssetHistory[]>;
}
