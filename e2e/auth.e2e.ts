import { providers, Wallet } from 'ethers';
import nock from 'nock';
import {
  AuthTokens,
  CacheClient,
  ProviderType,
  setCacheConfig,
  SignerService,
  TEST_LOGIN_ENDPOINT,
} from '../src';
import { rpcUrl } from './utils/setup-contracts';

describe('Authentication tests', () => {
  const SSI_HUB_URL = 'http://localhost:8080';
  const provider = new providers.JsonRpcProvider({ url: rpcUrl });

  const loginPathBody = { identityToken: /(^[\w-]*\.[\w-]*\.[\w-]*$)/ };

  let signerService: SignerService;
  let cacheClient: CacheClient;

  const getNockScope = (): nock.Scope => nock(SSI_HUB_URL);

  beforeAll(async () => {
    const network = await provider.getNetwork();
    setCacheConfig(network.chainId, {
      url: SSI_HUB_URL,
      cacheServerSupportsAuth: true,
    });
  });

  beforeEach(async () => {
    const wallet = Wallet.createRandom();
    signerService = new SignerService(
      wallet.connect(provider),
      ProviderType.PrivateKey
    );
    cacheClient = new CacheClient(signerService);
    await signerService.init();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('isAuthenticated()', () => {
    let nockScope: nock.Scope;

    beforeEach(() => {
      nockScope = getNockScope();
    });

    afterEach(() => {
      expect(nockScope.isDone()).toBe(true);
    });

    it('should return true if the user is authenticated', async () => {
      nockScope.get(TEST_LOGIN_ENDPOINT).reply(200, {
        user: signerService.did,
      });

      const isAuthenticated = await cacheClient.isAuthenticated();
      expect(isAuthenticated).toBe(true);
    });

    it('should return false if other user is authenticated', async () => {
      nockScope.get(TEST_LOGIN_ENDPOINT).reply(200, {
        user: 'did:ethr:0x0000000000000000000000000000000000000000',
      });

      const isAuthenticated = await cacheClient.isAuthenticated();
      expect(isAuthenticated).toBe(false);
    });

    it('should return false if empty user in response', async () => {
      nockScope.get(TEST_LOGIN_ENDPOINT).reply(200, {
        user: null,
      });

      const isAuthenticated = await cacheClient.isAuthenticated();
      expect(isAuthenticated).toBe(false);
    });

    it('should return false if server error occurred', async () => {
      nockScope.get(TEST_LOGIN_ENDPOINT).reply(500);

      const isAuthenticated = await cacheClient.isAuthenticated();
      expect(isAuthenticated).toBe(false);
    });
  });

  describe('refreshToken()', () => {
    let nockScope: nock.Scope;

    beforeEach(() => {
      nockScope = getNockScope();
    });

    it('should obtain new tokens from auth server', async () => {
      const newTokens = {
        token: 'new-token',
        refreshToken: 'new-refresh-token',
      };
      const oldRefreshToken = 'old-token';

      nockScope
        .get(`/refresh_token?refresh_token=${oldRefreshToken}`)
        .reply(200, newTokens);

      cacheClient['refresh_token'] = oldRefreshToken;

      await expect(cacheClient['refreshToken']()).resolves.toStrictEqual(
        newTokens
      );
      expect(nockScope.isDone()).toBe(true);
    });

    it('should not try to obtain new token if missing refresh token', async () => {
      const newTokens = {
        token: 'new-token',
        refreshToken: 'new-refresh-token',
      };
      const oldRefreshToken = 'old-token';

      nockScope
        .get(`/refresh_token?refresh_token=${oldRefreshToken}`)
        .reply(200, newTokens);

      await expect(cacheClient['refreshToken']()).resolves.toBeUndefined();
      expect(nockScope.isDone()).toBe(false);
    });

    it('should throw axios error if occurred', async () => {
      const oldRefreshToken = 'old-token';

      nockScope
        .get(`/refresh_token?refresh_token=${oldRefreshToken}`)
        .reply(500);

      cacheClient['refresh_token'] = oldRefreshToken;

      await expect(cacheClient['refreshToken']()).rejects.toBeDefined();
      expect(nockScope.isDone()).toBe(true);
    });
  });

  describe('login()', () => {
    it('should not authenticated when client is already authenticated', async () => {
      cacheClient['isAuthenticated'] = jest.fn().mockResolvedValueOnce(true);
      cacheClient['authenticate'] = jest.fn();
      await cacheClient.login();
      expect(cacheClient['authenticate']).not.toHaveBeenCalled();
    });

    it('should authenticate when client is not authenticated yet', async () => {
      cacheClient['isAuthenticated'] = jest.fn().mockResolvedValueOnce(false);
      cacheClient['authenticate'] = jest.fn();
      await cacheClient.login();
      expect(cacheClient['authenticate']).toHaveBeenCalledTimes(1);
    });
  });

  describe('authenticate()', () => {
    const checkTokens = (tokens: AuthTokens) => {
      expect(
        cacheClient['_httpClient'].defaults.headers.common.Authorization
      ).toBe(`Bearer ${tokens.token}`);
      expect(cacheClient['refresh_token']).toBe(tokens.refreshToken);
    };

    it('should refresh tokens', async () => {
      const newTokens = {
        token: 'new-token',
        refreshToken: 'new-refresh-token',
      };
      const oldRefreshToken = 'old-token';

      cacheClient['refresh_token'] = oldRefreshToken;

      const refreshScope = getNockScope()
        .get(`/refresh_token?refresh_token=${oldRefreshToken}`)
        .reply(200, newTokens);

      const loginScope = getNockScope()
        .post(`/login`, loginPathBody)
        .reply(200, newTokens);

      const statusScope = getNockScope().get(TEST_LOGIN_ENDPOINT).reply(200, {
        user: signerService.did,
      });

      await cacheClient.authenticate();

      checkTokens(newTokens);

      expect(refreshScope.isDone()).toBe(true);
      expect(loginScope.isDone()).toBe(false);
      expect(statusScope.isDone()).toBe(true);
    });

    it('should perform login when refresh token is empty', async () => {
      const newTokens = {
        token: 'new-token',
        refreshToken: 'new-refresh-token',
      };

      const refreshScope = getNockScope()
        .get(/^\/refresh_token/)
        .reply(200, newTokens);

      const loginScope = getNockScope()
        .post(`/login`, loginPathBody)
        .reply(200, newTokens);

      const statusScope = getNockScope().get(TEST_LOGIN_ENDPOINT).reply(200, {
        user: signerService.did,
      });

      await cacheClient.authenticate();

      checkTokens(newTokens);

      expect(refreshScope.isDone()).toBe(false);
      expect(loginScope.isDone()).toBe(true);
      expect(statusScope.isDone()).toBe(false);
    });

    it('should perform login when refreshing token fails', async () => {
      const newTokens = {
        token: 'new-token',
        refreshToken: 'new-refresh-token',
      };

      const oldRefreshToken = 'old-token';

      cacheClient['refresh_token'] = oldRefreshToken;

      const refreshScope = getNockScope()
        .get(/^\/refresh_token/)
        .reply(500, newTokens);

      const loginScope = getNockScope()
        .post(`/login`, loginPathBody)
        .reply(200, newTokens);

      const statusScope = getNockScope().get(TEST_LOGIN_ENDPOINT).reply(200, {
        user: signerService.did,
      });

      await cacheClient.authenticate();

      checkTokens(newTokens);

      expect(refreshScope.isDone()).toBe(true);
      expect(loginScope.isDone()).toBe(true);
      expect(statusScope.isDone()).toBe(false);
    });

    it('should perform login when refreshing token authorize other user', async () => {
      const newTokens = {
        token: 'new-token',
        refreshToken: 'new-refresh-token',
      };

      const oldRefreshToken = 'old-token';

      cacheClient['refresh_token'] = oldRefreshToken;

      const refreshScope = getNockScope()
        .get(/^\/refresh_token/)
        .reply(200, newTokens);

      const loginScope = getNockScope()
        .post(`/login`, loginPathBody)
        .reply(200, newTokens);

      const statusScope = getNockScope().get(TEST_LOGIN_ENDPOINT).reply(200, {
        user: 'did:ethr:volta:0x0000000000000000000000000000000000000000',
      });

      await cacheClient.authenticate();

      checkTokens(newTokens);

      expect(refreshScope.isDone()).toBe(true);
      expect(loginScope.isDone()).toBe(true);
      expect(statusScope.isDone()).toBe(true);
    });

    it('should throw an error when login fails', async () => {
      const newTokens = {
        token: 'new-token',
        refreshToken: 'new-refresh-token',
      };

      const loginScope = getNockScope()
        .post(`/login`, loginPathBody)
        .reply(500, newTokens);

      await expect(cacheClient.authenticate()).rejects.toBeDefined();

      expect(loginScope.isDone()).toBe(true);
    });
  });

  describe('makeRetryRequest()', () => {
    const MOCK_REQUEST_PATH = '/api/v1/test';
    const mockRequest = jest.fn().mockImplementation(async () => {
      const { data } = await cacheClient['_httpClient'].get<{
        success: boolean;
      }>(MOCK_REQUEST_PATH);

      if (!data.success) {
        throw new Error('Request failed');
      }

      return data;
    });

    afterEach(() => {
      mockRequest.mockClear();
    });

    it('should result with data after successful request', async () => {
      const nockScope = getNockScope().get(MOCK_REQUEST_PATH).reply(200, {
        success: true,
      });

      const data = await cacheClient['makeRetryRequest'](mockRequest);

      expect(data).toEqual({ success: true });
      expect(mockRequest).toHaveBeenCalledTimes(1);
      expect(nockScope.isDone()).toBe(true);
    });

    it('should not retry not axios error', async () => {
      const nockScope = getNockScope().get(MOCK_REQUEST_PATH).reply(200, {
        success: false,
      });

      await expect(
        cacheClient['makeRetryRequest'](mockRequest)
      ).rejects.toThrow('Request failed');

      expect(mockRequest).toHaveBeenCalledTimes(1);
      expect(nockScope.isDone()).toBe(true);
    });

    it('should retry 5xx errors', async () => {
      const nockScope = getNockScope()
        .get(MOCK_REQUEST_PATH)
        .reply(500)
        .get(MOCK_REQUEST_PATH)
        .reply(200, {
          success: true,
        });

      const data = await cacheClient['makeRetryRequest'](mockRequest);

      expect(data).toEqual({ success: true });
      expect(mockRequest).toHaveBeenCalledTimes(2);
      expect(nockScope.isDone()).toBe(true);
    });

    it('should retry ECONNREFUSED error', async () => {
      const nockScope = getNockScope()
        .get(MOCK_REQUEST_PATH)
        .replyWithError({
          code: 'ECONNREFUSED',
          errno: 'ECONNREFUSED',
        })
        .get(MOCK_REQUEST_PATH)
        .reply(200, {
          success: true,
        });

      const data = await cacheClient['makeRetryRequest'](mockRequest);

      expect(data).toEqual({ success: true });
      expect(mockRequest).toHaveBeenCalledTimes(2);
      expect(nockScope.isDone()).toBe(true);
    });

    it.each([
      408, 411, 412, 425, 426, 500, 501, 502, 503, 504, 505, 506, 510, 511,
    ])('should retry %i error', async (statusCode) => {
      const nockScope = getNockScope()
        .get(MOCK_REQUEST_PATH)
        .reply(statusCode)
        .get(MOCK_REQUEST_PATH)
        .reply(200, {
          success: true,
        });

      const data = await cacheClient['makeRetryRequest'](mockRequest);

      expect(data).toEqual({ success: true });
      expect(mockRequest).toHaveBeenCalledTimes(2);
      expect(nockScope.isDone()).toBe(true);
    });

    it.each([
      400, 402, 404, 405, 406, 409, 410, 413, 414, 415, 416, 417, 422, 428, 429,
      431, 451,
    ])('should not retry %i error', async (statusCode) => {
      const nockScope = getNockScope().get(MOCK_REQUEST_PATH).reply(statusCode);

      await expect(
        cacheClient['makeRetryRequest'](mockRequest)
      ).rejects.toThrow();

      expect(mockRequest).toHaveBeenCalledTimes(1);
      expect(nockScope.isDone()).toBe(true);
    });

    it('should not retry auth endpoints', async () => {
      const nockScope = getNockScope().post('/login').reply(401);

      const authMockRequest = jest.fn().mockImplementation(async () => {
        return await cacheClient['_httpClient'].post<{
          success: boolean;
        }>('/login');
      });

      await expect(
        cacheClient['makeRetryRequest'](authMockRequest)
      ).rejects.toThrow();

      expect(authMockRequest).toHaveBeenCalledTimes(1);
      expect(nockScope.isDone()).toBe(true);
    });

    it('should authenticate when 401 error occurred', async () => {
      const nockScope = getNockScope()
        .get(MOCK_REQUEST_PATH)
        .reply(401)
        .get(MOCK_REQUEST_PATH)
        .reply(200, {
          success: true,
        });

      cacheClient['authenticate'] = jest.fn().mockImplementation(async () => {
        return await new Promise((resolve) => {
          setTimeout(() => {
            resolve(0);
          }, 100);
        });
      });

      const data = await cacheClient['makeRetryRequest'](mockRequest);

      expect(data).toEqual({ success: true });
      expect(mockRequest).toHaveBeenCalledTimes(2);
      expect(nockScope.isDone()).toBe(true);
      expect(cacheClient['authenticate']).toHaveBeenCalledTimes(1);
    });

    it('should authenticate once when 401 error occurred in other request during ongoing authentication process', async () => {
      const nockScope = getNockScope()
        .get(MOCK_REQUEST_PATH)
        .reply(401)
        .get(MOCK_REQUEST_PATH)
        .reply(200, {
          success: true,
        });

      const mockOtherRequestPath = '/api/v1/test2';
      const nockScope2 = getNockScope()
        .get(mockOtherRequestPath)
        .reply(401)
        .get(mockOtherRequestPath)
        .reply(200, {
          success: true,
        });

      const mockOtherRequest = jest.fn().mockImplementation(async () => {
        const { data } = await cacheClient['_httpClient'].get<{
          success: boolean;
        }>(mockOtherRequestPath);
        return data;
      });

      cacheClient['authenticate'] = jest.fn().mockImplementation(async () => {
        return await new Promise((resolve) => {
          setTimeout(() => {
            resolve(0);
          }, 1000);
        });
      });

      const data = await Promise.all([
        cacheClient['makeRetryRequest'](mockRequest),
        cacheClient['makeRetryRequest'](mockOtherRequest),
      ]);

      expect(data).toStrictEqual(
        expect.arrayContaining([{ success: true }, { success: true }])
      );
      expect(mockRequest).toHaveBeenCalledTimes(2);
      expect(mockOtherRequest).toHaveBeenCalledTimes(2);
      expect(nockScope.isDone()).toBe(true);
      expect(nockScope2.isDone()).toBe(true);
      expect(cacheClient['authenticate']).toHaveBeenCalledTimes(1);
    });

    it('should retry when handler request threw error', async () => {
      const nockScope = getNockScope()
        .get(MOCK_REQUEST_PATH)
        .reply(500)
        .get(MOCK_REQUEST_PATH)
        .reply(200, {
          success: true,
        });

      cacheClient['handleRequestError'] = jest.fn().mockRejectedValue('error');

      const data = await cacheClient['makeRetryRequest'](mockRequest);

      expect(data).toEqual({ success: true });
      expect(mockRequest).toHaveBeenCalledTimes(2);
      expect(nockScope.isDone()).toBe(true);
    });

    it('should retry when auth endpoint threw 5xx error', async () => {
      const requestScope = getNockScope()
        .get(MOCK_REQUEST_PATH)
        .reply(401)
        .get(MOCK_REQUEST_PATH)
        .reply(401)
        .get(MOCK_REQUEST_PATH)
        .reply(200, {
          success: true,
        });

      const loginScope = getNockScope()
        .post('/login', loginPathBody)
        .reply(500)
        .post('/login', loginPathBody)
        .reply(201, {
          success: true,
        });

      const data = await cacheClient['makeRetryRequest'](mockRequest);

      expect(data).toEqual({ success: true });
      expect(mockRequest).toHaveBeenCalledTimes(3);
      expect(requestScope.isDone()).toBe(true);
      expect(loginScope.isDone()).toBe(true);
    });
  });
});
