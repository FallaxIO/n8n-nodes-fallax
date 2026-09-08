import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

/**
 * One workspace API key, created in Fallax under Settings, Integrations.
 *
 * The base URL is a field rather than a constant because Fallax is also run on
 * a customer's own domain in a couple of deployments, and a node that hard-codes
 * the SaaS host is a node those customers cannot use at all. It defaults to the
 * hosted API, so nobody else has to think about it.
 *
 * It holds the origin only, not the version: `/v1` is appended by the node (see
 * GenericFunctions.ts). A field that swallowed the whole base URL would let
 * somebody pin a version this node does not speak, and the resulting 404s would
 * look like a Fallax outage rather than a typo.
 *
 * `test` points at the cheapest authenticated endpoint there is. It answers
 * with the workspace's name, which is what makes a wrong-but-valid key (the
 * other workspace, the staging one) visible at the moment of pasting rather
 * than three weeks later in somebody's report.
 */
export class FallaxApi implements ICredentialType {
	name = 'fallaxApi';

	displayName = 'Fallax API';

	documentationUrl = 'https://fallax.io/docs/api';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Created in Fallax under Settings, Integrations, n8n. Shown once when you create it, so keep a copy. Read-only keys cannot create or update people.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.fallax.io',
			required: true,
			description:
				'The API origin, without a version. Change this only if Fallax runs on your own domain',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl.replace(/\\/$/, "")}}',
			url: '/v1/me',
		},
	};
}
