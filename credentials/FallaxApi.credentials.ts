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
 * hosted product, so nobody else has to think about it.
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
			default: 'https://app.fallax.io',
			required: true,
			description: 'Change this only if Fallax runs on your own domain',
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
			url: '/api/v1/me',
		},
	};
}
