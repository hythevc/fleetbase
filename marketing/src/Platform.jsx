import * as Tabs from '@radix-ui/react-tabs';
import { ArrowRight, Check, Ellipsis, MapPin, Plug, Radio, Truck, Wrench } from 'lucide-react';
import './platform.css';

const workflows = [
    {
        id: 'dispatch',
        label: 'Dispatch',
        board: 'Dispatch board',
        boardIcon: Truck,
        columns: ['Shipment', 'Driver', 'Status'],
        rows: [
            { name: 'FB-1042', assignment: 'Ava Chen', status: 'In transit', tone: 'green' },
            { name: 'FB-1043', assignment: 'Ken Tan', status: 'Assigned', tone: 'blue' },
            { name: 'FB-1044', assignment: 'Mira Patel', status: 'Planning', tone: 'gray' },
        ],
        activity: 'Delivery route',
        activityIcon: MapPin,
        steps: [
            { name: 'Jurong depot', detail: 'Departed · 09:12' },
            { name: 'Marina Bay', detail: 'En route · ETA 09:38' },
            { name: 'Changi hub', detail: 'Scheduled · ETA 10:05' },
        ],
        heading: 'Keep every assignment in view.',
        description: 'From assigning a driver to checking delivery progress, work stays visible to the whole team.',
    },
    {
        id: 'fleet',
        label: 'Fleet',
        board: 'Vehicle board',
        boardIcon: Truck,
        columns: ['Vehicle', 'Driver', 'Status'],
        rows: [
            { name: 'VAN-12', assignment: 'Ava Chen', status: 'On route', tone: 'green' },
            { name: 'TRK-07', assignment: 'Ken Tan', status: 'Available', tone: 'blue' },
            { name: 'VAN-18', assignment: 'Mira Patel', status: 'Inspection due', tone: 'gray' },
        ],
        activity: 'Vehicle activity',
        activityIcon: Wrench,
        steps: [
            { name: 'Pre-trip inspection', detail: 'Completed · 08:45' },
            { name: 'West route', detail: 'VAN-12 · 4 stops left' },
            { name: 'Service check', detail: 'Scheduled · 15:30' },
        ],
        heading: 'Know what’s ready to roll.',
        description: 'See which vehicles are available, where they are, and when they need an inspection.',
    },
    {
        id: 'integrations',
        label: 'Integrations',
        board: 'Developer console',
        boardIcon: Plug,
        columns: ['Connection', 'Purpose', 'Status'],
        rows: [
            { name: 'REST API', assignment: 'Order sync', status: 'Connected', tone: 'green' },
            { name: 'Webhooks', assignment: 'Event delivery', status: 'Active', tone: 'blue' },
            { name: 'Fleetbase MCP', assignment: 'Operations data', status: 'Read only', tone: 'gray' },
        ],
        activity: 'Integration activity',
        activityIcon: Radio,
        steps: [
            { name: 'Order imported', detail: 'REST API · 09:12' },
            { name: 'Status update', detail: 'Webhook · Sending' },
            { name: 'Fleet status check', detail: 'MCP · Ready to query' },
        ],
        heading: 'Connect the tools your team uses.',
        description: 'Sync orders over the API, send updates with webhooks, and give AI tools read access through MCP.',
    },
];

function Workspace({ workflow }) {
    const { id, board: title, boardIcon: BoardIcon, columns, rows } = workflow;

    return (
        <div className="platform-board">
            <div className="platform-pane-header">
                <span className="platform-icon"><BoardIcon aria-hidden="true" /></span>
                <div>
                    <h3 id={`platform-board-${id}`}>{title}</h3>
                    <p>Sample workspace</p>
                </div>
                <Ellipsis className="platform-board-more" aria-hidden="true" />
            </div>
            <table className="platform-table" aria-labelledby={`platform-board-${id}`}>
                <thead>
                    <tr>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr>
                </thead>
                <tbody>
                    {rows.map(({ name, assignment, status, tone }) => (
                        <tr key={name}>
                            <th scope="row">{name}</th>
                            <td>{assignment}</td>
                            <td><span className={`platform-status platform-status--${tone}`}>{status}</span></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Activity({ workflow }) {
    const { id, activity: title, activityIcon: ActivityIcon, steps } = workflow;

    return (
        <div className="platform-activity">
            <div className="platform-pane-header">
                <span className="platform-icon"><ActivityIcon aria-hidden="true" /></span>
                <h3 id={`platform-activity-${id}`}>{title}</h3>
            </div>
            <ol className="platform-timeline" aria-labelledby={`platform-activity-${id}`}>
                {steps.map(({ name, detail }, index) => (
                    <li key={name}>
                        <span className="platform-marker" aria-hidden="true">{index === 0 && <Check />}</span>
                        <div>
                            <p className="platform-step-name">{name}</p>
                            <p className="platform-step-detail">{detail}</p>
                        </div>
                    </li>
                ))}
            </ol>
        </div>
    );
}

export default function Platform({ activeTab, onTabChange, consoleUrl }) {
    return (
        <section id="platform" className="platform-section" aria-labelledby="platform-heading">
            <div className="container">
                <div className="platform-intro">
                    <h2 id="platform-heading">From dispatch to delivery.</h2>
                    <p>See how Fleetbase keeps the work moving from planning to handoff.</p>
                </div>
                <Tabs.Root id="how-it-works" value={activeTab} onValueChange={onTabChange}>
                    <Tabs.List className="platform-tabs" aria-label="Explore Fleetbase workflows">
                        {workflows.map(({ id, label }) => (
                            <Tabs.Trigger key={id} className="platform-tab" value={id}>{label}</Tabs.Trigger>
                        ))}
                    </Tabs.List>

                    {workflows.map((workflow) => (
                        <Tabs.Content key={workflow.id} className="platform-panel" value={workflow.id}>
                            <div className="platform-workspace">
                                <Workspace workflow={workflow} />
                                <Activity workflow={workflow} />
                            </div>
                            <div className="platform-outcome">
                                <h3>{workflow.heading}</h3>
                                <p>{workflow.description}</p>
                                <a className="platform-console-link" href={consoleUrl}>
                                    Open the console <ArrowRight aria-hidden="true" />
                                </a>
                            </div>
                        </Tabs.Content>
                    ))}
                </Tabs.Root>
            </div>
        </section>
    );
}
