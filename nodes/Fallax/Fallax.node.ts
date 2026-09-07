import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { fallaxApiRequest, fallaxApiRequestAllItems } from './GenericFunctions';

/**
 * Reading and writing one Fallax workspace inside a workflow.
 *
 * Four resources, chosen by what a workflow actually does with them rather than
 * by what the API happens to expose: reported mail and events are the things
 * worth reacting to, campaigns and the summary are what a report is built from,
 * and people are the half that has to stay in step with an HR system.
 *
 * There is no operation here that sends a simulation, because the API has none.
 * That is worth knowing when reading this file: the absence is deliberate and
 * not a gap waiting to be filled.
 */
export class Fallax implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Fallax',
		name: 'fallax',
		icon: 'file:fallax.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Read phishing-simulation results and keep your directory up to date',
		defaults: {
			name: 'Fallax',
		},
		inputs: ['main'],
		outputs: ['main'],
		usableAsTool: true,
		credentials: [
			{
				name: 'fallaxApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Campaign',
						value: 'campaign',
					},
					{
						name: 'Event',
						value: 'event',
					},
					{
						name: 'Person',
						value: 'person',
					},
					{
						name: 'Report',
						value: 'report',
					},
					{
						name: 'Summary',
						value: 'summary',
					},
				],
				default: 'report',
			},

			/* ------------------------------------------------------ Operations --- */
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['report'] } },
				options: [
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many reported messages',
						action: 'Get many reported messages',
					},
				],
				default: 'getAll',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['event'] } },
				options: [
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many simulation events',
						action: 'Get many simulation events',
					},
				],
				default: 'getAll',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['campaign'] } },
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get a campaign',
						action: 'Get a campaign',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many campaigns',
						action: 'Get many campaigns',
					},
				],
				default: 'getAll',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['person'] } },
				options: [
					{
						name: 'Archive',
						value: 'archive',
						description: 'Take a person out of the programme, keeping their history',
						action: 'Archive a person',
					},
					{
						name: 'Create or Update',
						value: 'upsert',
						description: 'Create a new record, or update the current one if it already exists (upsert)',
						action: 'Create or update a person',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a person',
						action: 'Get a person',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many people',
						action: 'Get many people',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a person by ID',
						action: 'Update a person',
					},
				],
				default: 'getAll',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['summary'] } },
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get the programme summary for a period',
						action: 'Get the programme summary',
					},
				],
				default: 'get',
			},

			/* ----------------------------------------------------------- Paging --- */
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				description: 'Whether to return all results or only up to a given limit',
				displayOptions: {
					show: {
						resource: ['report', 'event', 'campaign', 'person'],
						operation: ['getAll'],
					},
				},
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				typeOptions: { minValue: 1 },
				description: 'Max number of results to return',
				displayOptions: {
					show: {
						resource: ['report', 'event', 'campaign', 'person'],
						operation: ['getAll'],
						returnAll: [false],
					},
				},
			},

			/* ---------------------------------------------------------- Filters --- */
			{
				displayName: 'Filters',
				name: 'reportFilters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: { show: { resource: ['report'], operation: ['getAll'] } },
				options: [
					{
						displayName: 'Credited Only',
						name: 'credited',
						type: 'boolean',
						default: false,
						description:
							'Whether to return only the report that credited a person, rather than every copy of it',
					},
					{
						displayName: 'Reported After',
						name: 'since',
						type: 'dateTime',
						default: '',
						description: 'Only messages reported after this time, exclusive',
					},
					{
						displayName: 'Verdict',
						name: 'verdict',
						type: 'options',
						options: [
							{
								name: 'Simulation',
								value: 'simulation',
								description: 'Matched something Fallax sent',
							},
							{
								name: 'Unknown',
								value: 'unknown',
								description: 'Matched nothing Fallax sent, so possibly real',
							},
						],
						default: 'simulation',
					},
				],
			},
			{
				displayName: 'Filters',
				name: 'eventFilters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: { show: { resource: ['event'], operation: ['getAll'] } },
				options: [
					{
						displayName: 'Campaign ID',
						name: 'campaignId',
						type: 'string',
						default: '',
						description: 'Only events from one campaign',
					},
					{
						displayName: 'Occurred After',
						name: 'since',
						type: 'dateTime',
						default: '',
						description: 'Only events after this time, exclusive',
					},
					{
						displayName: 'Types',
						name: 'type',
						type: 'multiOptions',
						options: [
							{ name: 'Clicked', value: 'clicked' },
							{ name: 'Opened', value: 'opened' },
							{ name: 'Reported', value: 'reported' },
							{ name: 'Scanned', value: 'scanned' },
							{ name: 'Sent', value: 'sent' },
							{ name: 'Submitted', value: 'submitted' },
						],
						default: [],
						description: 'Leave empty for every type',
					},
				],
			},
			{
				displayName: 'Filters',
				name: 'campaignFilters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: { show: { resource: ['campaign'], operation: ['getAll'] } },
				options: [
					{
						displayName: 'Status',
						name: 'status',
						type: 'options',
						options: [
							{ name: 'Completed', value: 'completed' },
							{ name: 'Draft', value: 'draft' },
							{ name: 'Running', value: 'running' },
							{ name: 'Scheduled', value: 'scheduled' },
						],
						default: 'running',
					},
				],
			},
			{
				displayName: 'Filters',
				name: 'personFilters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: { show: { resource: ['person'], operation: ['getAll'] } },
				options: [
					{
						displayName: 'Department',
						name: 'department',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						placeholder: 'name@email.com',
						default: '',
					},
					{
						displayName: 'Status',
						name: 'status',
						type: 'options',
						options: [
							{ name: 'Active', value: 'active' },
							{ name: 'Archived', value: 'archived' },
							{ name: 'Excluded', value: 'excluded' },
						],
						default: 'active',
					},
				],
			},

			/* ------------------------------------------------------------- Ids --- */
			{
				displayName: 'Campaign ID',
				name: 'campaignId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['campaign'], operation: ['get'] } },
			},
			{
				displayName: 'Person ID',
				name: 'personId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: { resource: ['person'], operation: ['get', 'update', 'archive'] },
				},
			},

			/* ---------------------------------------------------------- Writing --- */
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				required: true,
				description: 'The person to add, or the existing person with this address',
				displayOptions: { show: { resource: ['person'], operation: ['upsert'] } },
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: { resource: ['person'], operation: ['upsert', 'update'] },
				},
				options: [
					{
						displayName: 'Department',
						name: 'department',
						type: 'string',
						default: '',
						description: 'Reporting and breakdowns group on this',
					},
					{
						displayName: 'First Name',
						name: 'firstName',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Language',
						name: 'locale',
						type: 'string',
						placeholder: 'nl-BE',
						default: '',
						description: 'BCP 47 tag deciding which translation of a lure they are sent',
					},
					{
						displayName: 'Last Name',
						name: 'lastName',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Position',
						name: 'position',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Status',
						name: 'status',
						type: 'options',
						options: [
							{
								name: 'Active',
								value: 'active',
								description: 'In scope for simulations',
							},
							{
								name: 'Archived',
								value: 'archived',
								description: 'Offboarded, history kept',
							},
							{
								name: 'Excluded',
								value: 'excluded',
								description: 'In the directory, never simulated, not billed',
							},
						],
						default: 'active',
					},
					{
						displayName: 'Time Zone',
						name: 'timezone',
						type: 'string',
						placeholder: 'Europe/Brussels',
						default: '',
						description: 'IANA zone deciding what local time they are sent at',
					},
				],
			},

			/* ---------------------------------------------------------- Summary --- */
			{
				displayName: 'Range',
				name: 'range',
				type: 'options',
				options: [
					{ name: 'All Time', value: 'all' },
					{ name: 'Last 12 Months', value: '12m' },
					{ name: 'Last 30 Days', value: '30d' },
					{ name: 'Last 90 Days', value: '90d' },
				],
				default: '90d',
				displayOptions: { show: { resource: ['summary'] } },
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returned: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				const rows = await runOne.call(this, resource, operation, i);

				returned.push(
					...rows.map((row) => ({
						json: row,
						pairedItem: { item: i },
					})),
				);
			} catch (error) {
				if (this.continueOnFail()) {
					returned.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returned];
	}
}

/** One input item's worth of work, as the rows it produced. */
async function runOne(
	this: IExecuteFunctions,
	resource: string,
	operation: string,
	i: number,
): Promise<IDataObject[]> {
	if (operation === 'getAll') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const limit = returnAll
			? Number.POSITIVE_INFINITY
			: (this.getNodeParameter('limit', i) as number);

		if (resource === 'report') {
			const filters = this.getNodeParameter('reportFilters', i, {}) as IDataObject;
			return fallaxApiRequestAllItems.call(this, '/reports', withoutEmpty(filters), limit);
		}
		if (resource === 'event') {
			const filters = this.getNodeParameter('eventFilters', i, {}) as IDataObject;
			const qs = withoutEmpty(filters);
			// The API takes one comma-separated list; the UI offers checkboxes.
			if (Array.isArray(qs.type)) qs.type = (qs.type as string[]).join(',');
			if (qs.type === '') delete qs.type;
			return fallaxApiRequestAllItems.call(this, '/events', qs, limit);
		}
		if (resource === 'campaign') {
			const filters = this.getNodeParameter('campaignFilters', i, {}) as IDataObject;
			return fallaxApiRequestAllItems.call(this, '/campaigns', withoutEmpty(filters), limit);
		}
		if (resource === 'person') {
			const filters = this.getNodeParameter('personFilters', i, {}) as IDataObject;
			return fallaxApiRequestAllItems.call(this, '/people', withoutEmpty(filters), limit);
		}
	}

	if (resource === 'campaign' && operation === 'get') {
		const id = this.getNodeParameter('campaignId', i) as string;
		return [await fallaxApiRequest.call(this, 'GET', `/campaigns/${encodeURIComponent(id)}`)];
	}

	if (resource === 'person' && operation === 'get') {
		const id = this.getNodeParameter('personId', i) as string;
		return [await fallaxApiRequest.call(this, 'GET', `/people/${encodeURIComponent(id)}`)];
	}

	if (resource === 'person' && operation === 'upsert') {
		const email = this.getNodeParameter('email', i) as string;
		const fields = this.getNodeParameter('fields', i, {}) as IDataObject;
		return [await fallaxApiRequest.call(this, 'POST', '/people', { email, ...withoutEmpty(fields) })];
	}

	if (resource === 'person' && operation === 'update') {
		const id = this.getNodeParameter('personId', i) as string;
		const fields = this.getNodeParameter('fields', i, {}) as IDataObject;
		return [
			await fallaxApiRequest.call(
				this,
				'PATCH',
				`/people/${encodeURIComponent(id)}`,
				withoutEmpty(fields),
			),
		];
	}

	if (resource === 'person' && operation === 'archive') {
		const id = this.getNodeParameter('personId', i) as string;
		return [
			await fallaxApiRequest.call(this, 'PATCH', `/people/${encodeURIComponent(id)}`, {
				status: 'archived',
			}),
		];
	}

	if (resource === 'summary') {
		const range = this.getNodeParameter('range', i) as string;
		return [await fallaxApiRequest.call(this, 'GET', '/summary', {}, { range })];
	}

	return [];
}

/**
 * An n8n collection returns every field the user added, including the ones they
 * added and then emptied. An empty string on a write means "clear this", which
 * is rarely what somebody meant by leaving a box blank, so it is dropped.
 */
function withoutEmpty(fields: IDataObject): IDataObject {
	return Object.fromEntries(
		Object.entries(fields).filter(([, value]) => value !== '' && value !== undefined),
	);
}
