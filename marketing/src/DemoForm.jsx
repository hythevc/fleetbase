import React, { useState } from 'react';
import { CircleCheck } from 'lucide-react';

const errorMessages = {
    422: 'Check the details you entered and try again.',
    429: 'Too many requests. Please wait a moment and try again.',
};
const requestError = 'We couldn’t submit your request. Please try again.';

export default function DemoForm() {
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');

    async function submit(event) {
        event.preventDefault();
        if (status === 'pending') return;
        const form = event.currentTarget;
        const details = Object.fromEntries(new FormData(form));
        setError('');
        setStatus('pending');
        try {
            const response = await fetch('/api/demo-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                credentials: 'omit',
                body: JSON.stringify(details),
                signal: AbortSignal.timeout(12000),
            });
            if (response.status !== 202 || !response.headers.get('content-type')?.includes('application/json')) {
                setError(errorMessages[response.status] ?? requestError);
                setStatus('idle');
                return;
            }
            if ((await response.json()).accepted !== true) throw new Error('Unexpected demo intake response');
            form.reset();
            setStatus('sent');
        } catch {
            setError(requestError);
            setStatus('idle');
        }
    }

    return (
        <section className="container demo-section" id="request-demo" aria-labelledby="demo-title">
            <div className="demo-intro">
                <h2 id="demo-title">See Fleetbase in action.</h2>
                <p>Tell us a little about your fleet. We’ll follow up to arrange a walkthrough.</p>
                <svg className="route-motif" viewBox="0 0 312 56" fill="none" aria-hidden="true">
                    <path d="M9 12h114c34 0 29 31 59 31h121" stroke="currentColor" strokeWidth="2" />
                    <circle cx="9" cy="12" r="5.5" fill="var(--bg)" stroke="currentColor" strokeWidth="3" />
                    <circle cx="303" cy="43" r="5.5" fill="var(--bg)" stroke="currentColor" strokeWidth="3" />
                </svg>
            </div>
            {status === 'sent' ? (
                <div className="demo-form sent-panel" role="status">
                    <CircleCheck size={44} strokeWidth={1.6} aria-hidden="true" />
                    <h3>Request received.</h3>
                    <p>Thanks. We’ll use the email you provided to follow up.</p>
                    <button className="text-action" type="button" onClick={() => setStatus('idle')}>Submit another request</button>
                </div>
            ) : (
                <form className="demo-form" onSubmit={submit} aria-busy={status === 'pending'} aria-describedby="demo-privacy">
                    <fieldset disabled={status === 'pending'}>
                        <div className="form-row">
                            <label>Full name<input name="name" autoComplete="name" maxLength="120" required /></label>
                            <label>Work email<input name="email" type="email" autoComplete="email" maxLength="254" required /></label>
                        </div>
                        <label>Company (optional)<input name="company" autoComplete="organization" maxLength="160" /></label>
                        <label>What would you like to see? (optional)<textarea name="message" rows="3" maxLength="2000" /></label>
                        <label className="form-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
                        {error && <p className="form-error" role="alert">{error}</p>}
                        <button className="button primary form-submit" type="submit">
                            {status === 'pending' ? 'Submitting…' : 'Request a demo'}
                        </button>
                    </fieldset>
                    <p className="form-note" id="demo-privacy">We’ll use these details to respond to your request.</p>
                </form>
            )}
        </section>
    );
}
