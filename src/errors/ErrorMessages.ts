export enum ERROR_MESSAGES {
  UNKNOWN_PROVIDER = 'Unknown provider type',
  ENS_TYPE_NOT_SUPPORTED = 'ENS type not supported',
  WALLET_PROVIDER_NOT_SUPPORTED = 'Wallet provider must be a supported value',
  NON_ETH_SIGN_SIGNATURE = 'Signature is not eth_sign verifiable',
  ORG_WITH_APPS = 'You are not able to remove organization with registered apps',
  ORG_WITH_ROLES = 'You are not able to remove organization with registered roles',
  APP_WITH_ROLES = 'You are not able to remove application with registered roles',
  METAMASK_PROVIDER_NOT_DETECTED = 'Metamask provider not detected',
  METAMASK_ACCOUNT_NOT_PROVIDED = 'Metamask account not provided',
  ROLE_PREREQUISITES_NOT_MET = "Enrolment subject doesn't have required roles",
  ROLE_NOT_EXISTS = 'Role you want to enroll to does not exists',
  CAN_NOT_UPDATE_NOT_CONTROLLED_DOCUMENT = 'Can not update not controlled document',
  ONCHAIN_ROLE_VERSION_NOT_SPECIFIED = 'On-chain role version not specified',
  WITHDRAWAL_WAS_NOT_REQUESTED = 'Stake withdrawal was not requested',
  STAKE_WAS_NOT_PUT = 'Stake was not put',
  INSUFFICIENT_BALANCE = 'Signer has insufficient balance',
  NOT_AUTHORIZED_TO_CHANGE_DOMAIN = 'Not authorized to change domain',
  ERROR_IN_AZURE_PROVIDER = 'Error in Azure Provider',
  JWT_ALGORITHM_NOT_SUPPORTED = 'Jwt algorithm not supported',
  CLAIM_WAS_NOT_ISSUED = 'Claim was not issued',
  ENS_OWNER_NOT_VALID_ADDRESS = 'Provided owner is not a valid address. Owner of ENS domain must be an address',
  IS_ETH_SIGNER_NOT_SET = 'Can not determine if signer is conformant with eth_sign specification',
}
