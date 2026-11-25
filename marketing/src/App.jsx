import React, { useEffect, useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import DemoForm from './DemoForm.jsx';
import Platform from './Platform.jsx';

const consoleOrigin = import.meta.env.VITE_FLEETBASE_CONSOLE_URL || 'https://hythe-fleetbase.vercel.app';
const signInUrl = new URL('/auth', consoleOrigin).href;
const defaultLogo = '/fleetbase-logo.svg';
const originalLogo = 'https://flb-assets.s3.ap-southeast-1.amazonaws.com/static/fleetbase-logo.png';

function publicImage(value) {
    if (typeof value !== 'string') return null;
    try {
        const image = new URL(value);
        return image.protocol === 'https:' && !image.username && !image.password ? image.href : null;
    } catch {
        return null;
    }
}

async function fetchPublic(path) {
    const response = await fetch(path, { credentials: 'omit', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(7000) });
    if (!response.ok) throw new Error('Fleetbase API unavailable');
    return response.json();
}

function Brand({ logo }) {
    return (
        <a className="brand" href="#top" aria-label="Fleetbase home">
            <img src={logo} width="812" height="137" alt="Fleetbase" onError={event => {
                if (event.currentTarget.getAttribute('src') !== defaultLogo) event.currentTarget.src = defaultLogo;
            }} />
        </a>
    );
}

function Links({ onNavigate, onIntegrations }) {
    return (
        <>
            <a href="#platform" onClick={onNavigate}>Platform</a>
            <a href="#how-it-works" onClick={onNavigate}>How it works</a>
            <a href="#integrations" onClick={() => { onIntegrations(); onNavigate?.(); }}>Integrations</a>
        </>
    );
}

function Header({ logo, onIntegrations }) {
    const [open, setOpen] = useState(false);
    const close = () => setOpen(false);
    return (
        <header className="site-header" onKeyDown={event => {
            if (event.key === 'Escape' && open) {
                close();
                document.getElementById('menu-toggle')?.focus();
            }
        }}>
            <div className="container header-row">
                <Brand logo={logo} />
                <nav className="desktop-nav" aria-label="Main navigation"><Links onIntegrations={onIntegrations} /></nav>
                <div className="header-actions">
                    <a className="sign-in" href={signInUrl}>Sign in</a>
                    <a className="button primary header-demo" href="#request-demo">Request a demo</a>
                    <button className="menu-toggle" id="menu-toggle" type="button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(value => !value)}>
                        {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
                    </button>
                </div>
            </div>
            <nav id="mobile-nav" className="container mobile-nav" aria-label="Mobile navigation" hidden={!open}>
                <Links onNavigate={close} onIntegrations={onIntegrations} />
                <a href={signInUrl} onClick={close}>Sign in</a>
                <a className="button primary" href="#request-demo" onClick={close}>Request a demo</a>
            </nav>
        </header>
    );
}

function Hero() {
    return (
        <section className="container hero" aria-labelledby="hero-title">
            <div className="hero-copy">
                <h1 id="hero-title"><span>Fleet</span>{' '}<span>operations,</span>{' '}<span>in one place.</span></h1>
                <p>Plan routes, assign work, and manage your fleet from one connected workspace.</p>
                <div className="hero-actions">
                    <a className="button primary" href="#request-demo">Request a demo</a>
                    <a className="text-action" href="#platform">Explore the platform <ArrowRight aria-hidden="true" /></a>
                </div>
            </div>
            <div className="hero-photo">
                <img src="/freight-terminal.webp" width="1536" height="1024" alt="Blue freight truck traveling through a container terminal at dusk" fetchPriority="high" />
            </div>
        </section>
    );
}

function Footer({ logo, status, onIntegrations }) {
    const description = { online: 'Operational', offline: 'Unavailable', checking: 'Checking' };
    return (
        <footer className="container footer-row" aria-label="Footer">
            <Brand logo={logo} />
            <nav aria-label="Footer navigation">
                <Links onIntegrations={onIntegrations} />
                <a href={signInUrl}>Sign in</a>
            </nav>
            <a className="status-link" href="/api/status" aria-label={`Service status ${description[status]}`}>
                <span className={`service-dot ${status}`} aria-hidden="true" />Service status
            </a>
        </footer>
    );
}

export default function App() {
    const [logo, setLogo] = useState(defaultLogo);
    const [status, setStatus] = useState('checking');
    const [activeTab, setActiveTab] = useState(() => location.hash === '#integrations' ? 'integrations' : 'dispatch');

    useEffect(() => {
        let current = true;
        fetchPublic('/api/branding').then(({ brand }) => {
            if (!current || !brand) return;
            const theme = brand.default_theme === 'light' ? 'light' : 'dark';
            document.documentElement.dataset.theme = theme;
            const serverLogo = publicImage(brand.logo_url);
            if (serverLogo && serverLogo !== originalLogo) setLogo(serverLogo);
            const icon = publicImage(brand.icon_url);
            if (icon) document.querySelector('link[rel="icon"]').href = icon;
        }).catch(() => {});
        fetchPublic('/api/status').then(data => { if (current) setStatus(data.status === 'ok' ? 'online' : 'offline'); })
            .catch(() => { if (current) setStatus('offline'); });
        const updateFromHash = () => { if (location.hash === '#integrations') setActiveTab('integrations'); };
        window.addEventListener('hashchange', updateFromHash);
        return () => { current = false; window.removeEventListener('hashchange', updateFromHash); };
    }, []);

    const showIntegrations = () => setActiveTab('integrations');
    return (
        <div id="top">
            <a className="skip-link" href="#main">Skip to content</a>
            <Header logo={logo} onIntegrations={showIntegrations} />
            <main id="main">
                <Hero />
                <div id="integrations" />
                <Platform activeTab={activeTab} onTabChange={setActiveTab} consoleUrl={signInUrl} />
                <DemoForm />
            </main>
            <Footer logo={logo} status={status} onIntegrations={showIntegrations} />
        </div>
    );
}
