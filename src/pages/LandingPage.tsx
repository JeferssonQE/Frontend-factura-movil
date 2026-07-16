import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Play, Camera, Mic, Menu, User, Sparkles, Check, Send, Home, Plus,
  ScanLine, Building2, Users, LineChart, FileText, Zap, Target, House, History,
  ChevronLeft, Search, RefreshCw, Receipt, FileMinus, FilePlus, Monitor,
  Keyboard, Clock, TriangleAlert, Smartphone, CheckCircle, CheckCircle2, Mail,
  MessageCircle, Globe,
} from 'lucide-react';
import './landing.css';

const WHATSAPP_NUMBER = '51963376546';
const WHATSAPP_MESSAGE = 'Hola, quiero probar FactuMovil AI. ¿Me cuentan cómo funciona?';
const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

const LOGO_ICON = '/logo-icon.png';

const goToSection = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const Wordmark: React.FC<{ size?: number }> = ({ size = 30 }) => (
  <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
    <img src={LOGO_ICON} alt="" style={{ height: size, width: size, borderRadius: 7, display: 'block' }} />
    <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-.02em', color: '#fff', lineHeight: 1 }}>
      Factu<span style={{ color: 'var(--blue)' }}>Movil</span>
    </span>
  </span>
);

const features = [
  { icon: ScanLine, title: 'Foto o audio con IA', desc: 'Lee tu documento o nota de voz y autocompleta cliente, productos y montos.' },
  { icon: Building2, title: 'Directo a SUNAT', desc: 'Envío y validación al instante, con la representación impresa lista.' },
  { icon: Users, title: 'Clientes y productos', desc: 'Tu catálogo y tu cartera guardados, listos para reusar en cada venta.' },
  { icon: LineChart, title: 'Reportes en vivo', desc: 'Cuánto vendes por día, producto o cliente. Decide con datos.' },
];

const metrics = [
  { n: '3', label: 'toques para emitir un comprobante completo', highlight: true },
  { n: '18%', label: 'de IGV calculado automáticamente, sin errores' },
  { n: '100%', label: 'de comprobantes validados ante SUNAT' },
  { n: '24/7', label: 'emite desde el celular, cuando lo necesites' },
];

const pasItems = [
  'Tipear el RUC y los datos del cliente uno por uno',
  'Calcular el IGV y los totales sin equivocarte',
  'Pelear con un portal lento que se cae',
  'Volver a casa solo para emitir desde la PC',
  'Comprobantes que rebotan por un dato mal puesto',
];

const steps = [
  { n: '01', icon: Camera, title: 'Captura', desc: 'Toma una foto del documento o graba un audio con los datos de la venta.' },
  { n: '02', icon: Sparkles, title: 'La IA completa', desc: 'Cliente, productos, cantidades y montos se llenan solos. Revisa y ajusta.' },
  { n: '03', icon: CheckCircle2, title: 'Emite a SUNAT', desc: 'Envía el comprobante con un toque. Tu cliente lo recibe al instante.', emerald: true },
];

const guarantees = [
  { icon: Building2, title: 'Validado por SUNAT', desc: 'Facturas, boletas y notas de crédito aceptadas oficialmente. Tu comprobante llega válido a la primera.' },
  { icon: Zap, title: 'Emite en segundos', desc: 'Toma una foto o graba un audio; la IA completa y envía. Sin tipear el RUC ni calcular el IGV a mano.' },
  { icon: MessageCircle, title: 'Soporte por WhatsApp', desc: 'Te acompañamos a configurar tu cuenta y resolvemos tus dudas directo por chat, sin tickets ni esperas.' },
];

const transformBefore = [
  { icon: Monitor, text: 'Atado a la computadora' },
  { icon: Keyboard, text: 'Tipeando RUC y montos a mano' },
  { icon: Clock, text: 'Minutos por cada comprobante' },
  { icon: TriangleAlert, text: 'Errores que rebotan en SUNAT' },
];

const transformAfter = [
  { icon: Smartphone, text: 'Desde el celular, donde estés' },
  { icon: Sparkles, text: 'La IA llena todo por ti' },
  { icon: Zap, text: 'Segundos por comprobante' },
  { icon: CheckCircle, text: 'Validado a la primera' },
];

type DemoView = 'cam' | 'fields' | 'rec' | 'map' | 'done';
interface DemoStep {
  d: number; tab: 'foto' | 'audio'; view: DemoView; cap: string;
  camText?: string; recText?: string; sending?: boolean;
  doneSub?: string; doneNum?: string; doneTot?: string;
}

const DEMO_STEPS: DemoStep[] = [
  { d: 1600, tab: 'foto', view: 'cam', camText: 'Apunta a tu comprobante', cap: '01 · Captura por foto' },
  { d: 1500, tab: 'foto', view: 'cam', camText: 'Leyendo con IA…', cap: '02 · La IA lee el documento' },
  { d: 2500, tab: 'foto', view: 'fields', sending: false, cap: '03 · Autocompletado por IA' },
  { d: 1500, tab: 'foto', view: 'fields', sending: true, cap: '04 · Enviando a SUNAT' },
  { d: 2400, tab: 'foto', view: 'done', doneSub: 'Boleta de venta electrónica', doneNum: 'F001-00042', doneTot: 'S/ 348.00', cap: '05 · ¡Emitido en segundos!' },
  { d: 2200, tab: 'audio', view: 'rec', recText: 'Grabando… 0:03', cap: '01 · Graba un audio' },
  { d: 1300, tab: 'audio', view: 'rec', recText: 'Transcribiendo…', cap: '02 · Transcribiendo voz' },
  { d: 2400, tab: 'audio', view: 'map', sending: false, cap: '03 · Mapeando campos' },
  { d: 1500, tab: 'audio', view: 'map', sending: true, cap: '04 · Enviando a SUNAT' },
  { d: 2400, tab: 'audio', view: 'done', doneSub: 'Factura electrónica', doneNum: 'F001-00091', doneTot: 'S/ 80.00', cap: '05 · ¡Emitido en segundos!' },
];

const WAVE_DELAYS = [0, 90, 180, 60, 240, 120, 300, 150, 30, 210, 90, 270, 60, 180];
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const FieldRow: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="frow">
    <div>
      <p className="flbl">{label}</p>
      <p className={`fval${mono ? ' mono' : ''}`}>{value}</p>
    </div>
    <Check className="fchk" />
  </div>
);

const EmitButton: React.FC<{ sending?: boolean }> = ({ sending }) => (
  <button className={`emit${sending ? ' sending' : ''}`} type="button">
    <span className="emit-label"><Send /> Emitir a SUNAT</span>
    <span className="emit-spin" />
  </button>
);

const PhoneDemo: React.FC = () => {
  const [reduce] = useState(prefersReducedMotion);
  const [idx, setIdx] = useState(() => (prefersReducedMotion() ? 2 : 0));
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduce || paused) return;
    const id = window.setTimeout(() => setIdx((i) => (i + 1) % DEMO_STEPS.length), DEMO_STEPS[idx].d);
    return () => window.clearTimeout(id);
  }, [idx, paused, reduce]);

  useEffect(() => {
    if (reduce) return;
    const onVis = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [reduce]);

  const step = DEMO_STEPS[idx];
  const goTab = (tab: 'foto' | 'audio') => { if (!reduce) setIdx(tab === 'foto' ? 0 : 5); };

  const renderView = () => {
    switch (step.view) {
      case 'cam':
        return (
          <div className="view" key="cam">
            <div className="vf">
              <span className="br tl" /><span className="br tr" /><span className="br bl" /><span className="br br2" />
              <div className="receipt">
                <div className="rl" style={{ width: '46%' }} />
                <div className="rl" style={{ width: '74%' }} />
                <div className="rl" style={{ width: '64%' }} />
                <div className="rl" style={{ width: '54%' }} />
                <div className="rl strong" style={{ width: '42%' }} />
              </div>
              <div className="vf-scan" />
              <div className="vf-chip"><span className="dotpulse" /> <span>{step.camText}</span></div>
            </div>
            <button className="shutter" type="button"><span /></button>
          </div>
        );
      case 'fields':
        return (
          <div className="view" key="fields">
            <div className="chip-ia"><Sparkles /> Autocompletado por IA</div>
            <div className="fcard">
              <FieldRow label="RUC" value="20100000001" mono />
              <FieldRow label="CLIENTE" value="Cliente Demo S.A." />
              <FieldRow label="PRODUCTOS" value="2 ítems · 12 und." />
              <FieldRow label="IGV 18%" value="S/ 53.08" mono />
            </div>
            <div className="total"><span>Total a pagar</span><b className="mono">S/ 348.00</b></div>
            <EmitButton sending={step.sending} />
          </div>
        );
      case 'rec':
        return (
          <div className="view" key="rec">
            <div className="mic"><span className="micwave" /><Mic /></div>
            <div className="wave">{WAVE_DELAYS.map((ms, i) => <i key={i} style={{ animationDelay: `${ms}ms` }} />)}</div>
            <div className="rec-chip"><span className="dotpulse" style={{ background: '#ff5a5a' }} /> <span>{step.recText}</span></div>
            <div className="transcript">“Dos polos para Juan Pérez, ochenta soles.”</div>
          </div>
        );
      case 'map':
        return (
          <div className="view" key="map">
            <div className="chip-ia"><Sparkles /> Mapeando campos</div>
            <div className="fcard">
              <FieldRow label="CLIENTE" value="Juan Pérez" />
              <FieldRow label="PRODUCTO" value="2 × Polo" />
              <FieldRow label="P. UNITARIO" value="S/ 40.00" mono />
            </div>
            <div className="total"><span>Total a pagar</span><b className="mono">S/ 80.00</b></div>
            <EmitButton sending={step.sending} />
          </div>
        );
      case 'done':
        return (
          <div className="view v-done" key="done">
            <span className="done-ok"><Check /></span>
            <p className="done-ok-t">¡Emitido a SUNAT!</p>
            <p className="done-ok-s">{step.doneSub}</p>
            <div className="done-ok-card">
              <div className="done-okr"><span>N° comprobante</span><b className="mono">{step.doneNum}</b></div>
              <div className="done-okr"><span>Total</span><b className="mono">{step.doneTot}</b></div>
              <div className="done-okr"><span>Estado</span><span className="done-okbadge">ACEPTADO</span></div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="reveal" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <div className="hero-chip float" style={{ top: 92, left: 2, ['--rot' as string]: '-4deg' } as React.CSSProperties}>
        <span className="hc-ic" style={{ background: 'rgba(44,75,245,.12)' }}><Camera style={{ color: '#2C4BF5' }} /></span>
        <div><p className="hc-lbl">Detectado por IA</p><p className="hc-val">Boleta de venta</p></div>
      </div>
      <div className="hero-chip float" style={{ bottom: 92, right: 0, animationDelay: '-2.4s', ['--rot' as string]: '3deg' } as React.CSSProperties}>
        <span className="hc-ic" style={{ background: 'rgba(16,185,129,.14)' }}><Check style={{ color: '#10B981' }} /></span>
        <div><p className="hc-lbl">Enviado a SUNAT</p><p className="hc-val mono">F001-00042</p></div>
      </div>

      <div className="demo-tabs">
        <button className={`dtab${step.tab === 'foto' ? ' on' : ''}`} type="button" onClick={() => goTab('foto')}><Camera /> Por foto</button>
        <button className={`dtab${step.tab === 'audio' ? ' on' : ''}`} type="button" onClick={() => goTab('audio')}><Mic /> Por audio</button>
      </div>

      <div className="phone" style={{ width: '300px' }}>
        <div className="screen" style={{ aspectRatio: '360/620', display: 'flex', flexDirection: 'column', background: '#eef2f9' }}>
          <div className="pnotch" />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 16px 11px', background: '#fff' }}>
            <Menu style={{ width: 16, height: 16, color: '#9aa3b8' }} />
            <span style={{ font: "800 11px/1 'Hanken Grotesk', sans-serif", letterSpacing: '.12em', color: '#112657' }}>EMITIR DOCUMENTO</span>
            <span className="mk-avatar"><User style={{ width: 14, height: 14 }} /></span>
          </div>
          <div className="demo-stage" style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
            {renderView()}
          </div>
          <div className="mk-nav demo-foot">
            <Home style={{ width: 16, height: 16, color: '#9aa3b8' }} />
            <span className="fab"><Plus style={{ width: 20, height: 20 }} /></span>
            <User style={{ width: 16, height: 16, color: '#9aa3b8' }} />
          </div>
        </div>
      </div>

      <div className="demo-cap mono">{step.cap}</div>
    </div>
  );
};

const Nav: React.FC<{ scrolled: boolean }> = ({ scrolled }) => (
  <header className={`nav${scrolled ? ' scrolled' : ''}`}>
    <div className="bar">
      <nav className="wrap" style={{ height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="#top" onClick={goToSection('top')} aria-label="FactuMovil AI" style={{ textDecoration: 'none' }}>
          <Wordmark />
        </a>
        <div style={{ display: 'flex', gap: 34, alignItems: 'center' }} className="hide-sm">
          <a className="navlink" href="#solucion" onClick={goToSection('solucion')}>Solución</a>
          <a className="navlink" href="#como" onClick={goToSection('como')}>Cómo funciona</a>
          <a className="navlink" href="#confianza" onClick={goToSection('confianza')}>Confianza</a>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link className="navlink hide-sm" to="/login" style={{ padding: '.55rem .4rem' }}>Iniciar sesión</Link>
          <a className="btn btn-primary" href={whatsappUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '.6rem 1.15rem', fontSize: '.92rem' }}>
            Solicita tu demo <MessageCircle className="ar" />
          </a>
        </div>
      </nav>
    </div>
  </header>
);

const Hero: React.FC = () => (
  <section className="grain" style={{ position: 'relative', overflow: 'hidden', paddingTop: 128, paddingBottom: 80 }}>
    <div className="dotgrid" style={{ position: 'absolute', inset: 0, opacity: .6, WebkitMaskImage: 'radial-gradient(ellipse at 30% 0%,#000,transparent 70%)', maskImage: 'radial-gradient(ellipse at 30% 0%,#000,transparent 70%)' }} />
    <div style={{ position: 'absolute', top: -180, right: -100, width: 640, height: 640, borderRadius: 999, background: 'radial-gradient(circle,rgba(61,91,255,.40),transparent 62%)', filter: 'blur(30px)', pointerEvents: 'none' }} />
    <div style={{ position: 'absolute', top: 100, left: -180, width: 520, height: 520, borderRadius: 999, background: 'radial-gradient(circle,rgba(28,71,168,.38),transparent 66%)', filter: 'blur(44px)', pointerEvents: 'none' }} />
    <div className="wrap hero-grid" style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1.08fr .92fr', gap: 48, alignItems: 'center' }}>
      <div style={{ maxWidth: 600 }}>
        <div className="reveal pill mono" style={{ letterSpacing: '.12em', textTransform: 'uppercase', fontSize: '.72rem' }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--emerald)', boxShadow: '0 0 10px var(--emerald)' }} />
          Facturación electrónica · Perú
        </div>
        <h1 className="reveal disp" style={{ margin: '22px 0 0' }}>
          Factura a SUNAT con{' '}
          <span className="mark">una foto
            <svg viewBox="0 0 200 12" preserveAspectRatio="none" fill="none"><path d="M3 8.5C54 3.5 150 3 197 7.5" stroke="#3D5BFF" strokeWidth="5" strokeLinecap="round" /></svg>
          </span>{' '}
          o un audio.
        </h1>
        <p className="reveal lead" style={{ margin: '26px 0 0', maxWidth: '30em' }}>
          Toma una foto o graba una nota de voz. La IA llena el comprobante —cliente, productos, IGV— y lo emite a SUNAT por ti. En segundos, desde el celular.
        </p>
        <div className="reveal" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 34 }}>
          <a className="btn btn-primary" href={whatsappUrl} target="_blank" rel="noopener noreferrer">Solicita tu demo <ArrowRight className="ar" /></a>
          <a className="btn btn-ghost" href="#como" onClick={goToSection('como')}><Play /> Ver cómo funciona</a>
        </div>
        <div className="reveal" style={{ display: 'flex', gap: 26, flexWrap: 'wrap', marginTop: 34, alignItems: 'center' }}>
          <div><span className="mono" style={{ fontWeight: 700, fontSize: '1.3rem', color: '#fff' }}>3</span> <span style={{ color: 'var(--mut)', fontSize: '.9rem' }}>toques para emitir</span></div>
          <div style={{ width: 1, height: 26, background: 'var(--line)' }} />
          <div><span className="mono" style={{ fontWeight: 700, fontSize: '1.3rem', color: '#fff' }}>100%</span> <span style={{ color: 'var(--mut)', fontSize: '.9rem' }}>válido en SUNAT</span></div>
        </div>
      </div>
      <PhoneDemo />
    </div>
  </section>
);

const Metrics: React.FC = () => (
  <section className="cream grain">
    <div className="wrap" style={{ paddingBlock: 'clamp(48px,7vw,84px)' }}>
      <p className="eyebrow reveal">Resultados</p>
      <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 34, marginTop: 34 }}>
        {metrics.map((m) => (
          <div className="metric reveal" key={m.n + m.label}>
            <div className="n" style={m.highlight ? { color: 'var(--blue-2)' } : undefined}>{m.n}</div>
            <p style={{ margin: '.5rem 0 0', fontWeight: 600, fontSize: '.95rem', maxWidth: '14em' }}>{m.label}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Problem: React.FC = () => (
  <section className="grain" style={{ position: 'relative', paddingBlock: 'clamp(64px,9vw,120px)' }}>
    <div className="wrap pas-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }}>
      <div>
        <p className="eyebrow reveal" style={{ color: 'var(--blue)' }}>El problema</p>
        <h2 className="disp reveal" style={{ margin: '16px 0 0' }}>Facturar no debería robarte la noche.</h2>
        <p className="lead reveal" style={{ margin: '22px 0 0', maxWidth: '26em' }}>
          El portal de SUNAT es lento, tipeas RUC y montos a mano, y un error rebota el comprobante. Terminas facturando tarde, frente a la computadora, en vez de vender.
        </p>
      </div>
      <ul className="reveal" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {pasItems.map((item) => <li className="pas-row" key={item}>{item}</li>)}
      </ul>
    </div>
  </section>
);

const DashboardMock: React.FC = () => (
  <div className="reveal" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    <div className="phone" style={{ width: 242 }}>
      <div className="screen" style={{ display: 'flex', flexDirection: 'column', aspectRatio: '360/712' }}>
        <div className="pnotch" />
        <div className="flex items-center justify-between px-4 pt-6 pb-3 bg-white">
          <Menu className="w-4 h-4 text-secondary/50" />
          <span className="grid place-items-center w-7 h-7 rounded-lg bg-accent text-white"><FileText className="w-3.5 h-3.5" /></span>
          <span className="mk-avatar"><User className="w-3.5 h-3.5" /></span>
        </div>
        <div className="flex-1 px-3.5 py-3.5 space-y-2.5">
          <div className="relative overflow-hidden rounded-2xl px-4 py-3.5 text-white" style={{ background: 'radial-gradient(120% 140% at 0% 0%,#1c3a78 0%,transparent 55%),linear-gradient(135deg,#0f1c33,#0a1326)' }}>
            <p className="text-[7.5px] font-bold uppercase tracking-[0.18em] text-accent">Emisor activo</p>
            <p className="mt-1 text-[13px] font-extrabold leading-tight">Mi Empresa S.A.C.</p>
            <p className="text-[8px] text-white/45">RUC: 20100000001</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <span className="rounded-lg bg-accent py-1.5 text-center text-[9px] font-bold">NUEVA VENTA</span>
              <span className="rounded-lg bg-white/10 ring-1 ring-inset ring-white/15 py-1.5 text-center text-[9px] font-bold">HISTORIAL</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-black/5 text-center"><span className="grid place-items-center w-6 h-6 mx-auto rounded-md bg-accent/10"><FileText className="w-3 h-3 text-accent" /></span><p className="mt-1 text-[7px] font-bold text-secondary/45 leading-tight">TICKETS<br />DEL MES</p><p className="text-[11px] font-extrabold text-primary">0</p></div>
            <div className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-black/5 text-center"><span className="grid place-items-center w-6 h-6 mx-auto rounded-md bg-violet-100"><Zap className="w-3 h-3 text-violet-500" /></span><p className="mt-1 text-[7px] font-bold text-secondary/45 leading-tight">IGV<br />DEL MES</p><p className="text-[11px] font-extrabold text-primary">—</p></div>
            <div className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-black/5 text-center"><span className="grid place-items-center w-6 h-6 mx-auto rounded-md bg-emerald-100"><Target className="w-3 h-3 text-emerald-500" /></span><p className="mt-1 text-[7px] font-bold text-secondary/45 leading-tight">TOTAL<br />VENTAS</p><p className="text-[11px] font-extrabold text-primary">—</p></div>
          </div>
          <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
            <div className="flex items-center justify-between"><p className="text-[9px] font-extrabold text-primary">ACTIVIDAD RECIENTE</p><span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[7px] font-bold text-accent">LIVE</span></div>
            <div className="mt-3 flex items-end gap-1.5 h-12"><span className="flex-1 rounded-t bg-slate-200" style={{ height: '30%' }} /><span className="flex-1 rounded-t bg-slate-200" style={{ height: '55%' }} /><span className="flex-1 rounded-t bg-slate-200" style={{ height: '40%' }} /><span className="flex-1 rounded-t bg-accent/40" style={{ height: '70%' }} /><span className="flex-1 rounded-t bg-accent" style={{ height: '100%' }} /></div>
          </div>
        </div>
        <div className="mk-nav relative bg-white px-8 py-3 flex items-center justify-between">
          <Home className="w-4 h-4 text-accent" />
          <span className="absolute left-1/2 -translate-x-1/2 -top-4 grid place-items-center w-11 h-11 rounded-2xl bg-primary text-white shadow-lg shadow-primary/30"><Plus className="w-5 h-5" /></span>
          <User className="w-4 h-4 text-secondary/40" />
        </div>
      </div>
    </div>
    <p style={{ margin: '18px 0 0', fontWeight: 700, display: 'flex', gap: 7, alignItems: 'center' }}><House style={{ width: 16, height: 16, color: 'var(--blue)' }} /> Dashboard</p>
  </div>
);

const HistoryMock: React.FC = () => (
  <div className="reveal" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    <div className="phone" style={{ width: 242 }}>
      <div className="screen" style={{ display: 'flex', flexDirection: 'column', aspectRatio: '360/712' }}>
        <div className="pnotch" />
        <div className="flex items-center justify-between px-4 pt-6 pb-3 bg-white">
          <ChevronLeft className="w-4 h-4 text-secondary/50" />
          <span className="text-[11px] font-extrabold tracking-[0.12em] text-primary">HISTORIAL</span>
          <span className="mk-avatar"><User className="w-3.5 h-3.5" /></span>
        </div>
        <div className="flex-1 px-3.5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-1.5 rounded-full bg-white px-3 py-2 shadow-sm ring-1 ring-black/5"><Search className="w-3 h-3 text-secondary/40" /><span className="text-[8.5px] text-secondary/40">Buscar por cliente o número…</span></div>
            <span className="grid place-items-center w-8 h-8 rounded-full bg-white shadow-sm ring-1 ring-black/5"><RefreshCw className="w-3 h-3 text-secondary/40" /></span>
          </div>
          <div className="mt-3 flex items-center gap-3 text-[9px] font-bold"><span className="text-accent border-b-2 border-accent pb-1">TODOS</span><span className="text-secondary/40">BOLETA</span><span className="text-secondary/40">FACTURA</span></div>
          <div className="mt-3 space-y-2">
            {[{ name: 'Cliente Demo S.A.', amount: 'S/ 120.00' }, { name: 'Juana Torres', amount: 'S/ 48.00' }, { name: 'Carlos Díaz', amount: 'S/ 55.00' }].map((r) => (
              <div className="rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-black/5 flex items-center gap-2" key={r.name}>
                <span className="grid place-items-center w-7 h-7 rounded-lg bg-accent/10"><FileText className="w-3.5 h-3.5 text-accent" /></span>
                <div className="flex-1 leading-tight"><p className="text-[10px] font-bold text-primary">{r.name}</p><span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1 text-[7px] font-bold text-emerald-600">EMITIDO</span></div>
                <p className="text-[11px] font-extrabold text-primary">{r.amount}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mk-nav relative bg-white px-8 py-3 flex items-center justify-between">
          <Home className="w-4 h-4 text-secondary/40" />
          <span className="absolute left-1/2 -translate-x-1/2 -top-4 grid place-items-center w-11 h-11 rounded-2xl bg-primary text-white shadow-lg shadow-primary/30"><Plus className="w-5 h-5" /></span>
          <User className="w-4 h-4 text-secondary/40" />
        </div>
      </div>
    </div>
    <p style={{ margin: '18px 0 0', fontWeight: 700, display: 'flex', gap: 7, alignItems: 'center' }}><History style={{ width: 16, height: 16, color: 'var(--blue)' }} /> Historial</p>
  </div>
);

const Solution: React.FC = () => (
  <section id="solucion" className="grain" style={{ position: 'relative', paddingBlock: 'clamp(64px,9vw,120px)' }}>
    <div className="wrap">
      <div style={{ maxWidth: '34em' }}>
        <p className="eyebrow reveal" style={{ color: 'var(--blue)' }}>La solución</p>
        <h2 className="disp reveal" style={{ margin: '16px 0 0' }}>Una app. Tres toques. Listo.</h2>
        <p className="lead reveal" style={{ margin: '20px 0 0' }}>
          FactuMovil convierte una foto o un audio en un comprobante válido. Tú confirmas; la IA hace lo demás.
        </p>
      </div>
      <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18, marginTop: 48 }}>
        {features.map(({ icon: Icon, title, desc }) => (
          <article className="card reveal" key={title}>
            <span className="ico"><Icon /></span>
            <h3 className="disp" style={{ fontSize: '1.25rem', margin: '18px 0 0', color: '#fff' }}>{title}</h3>
            <p style={{ margin: '.6rem 0 0', color: 'var(--mut)', fontSize: '.95rem', lineHeight: 1.55 }}>{desc}</p>
          </article>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 40, flexWrap: 'wrap', marginTop: 64 }}>
        <DashboardMock />
        <HistoryMock />
      </div>
    </div>
  </section>
);

const HowItWorks: React.FC = () => (
  <section id="como" className="grain" style={{ position: 'relative', paddingBlock: 'clamp(48px,7vw,90px)', background: 'var(--ink-2)', borderBlock: '1px solid var(--line)' }}>
    <div className="wrap">
      <p className="eyebrow reveal" style={{ color: 'var(--blue)' }}>Cómo funciona</p>
      <h2 className="disp reveal" style={{ margin: '16px 0 0' }}>Tres pasos. Menos de un minuto.</h2>
      <div className="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, marginTop: 46 }}>
        {steps.map(({ n, icon: Icon, title, desc, emerald }) => (
          <div className="reveal step" key={n}>
            <div className="step-h">
              <span className="mono">{n}</span>
              <span className="step-ic" style={emerald ? { background: 'rgba(31,203,122,.14)', color: 'var(--emerald)' } : undefined}><Icon /></span>
            </div>
            <h3 className="disp" style={{ fontSize: '1.4rem', margin: '18px 0 0', color: '#fff' }}>{title}</h3>
            <p style={{ margin: '.5rem 0 0', color: 'var(--mut)', lineHeight: 1.55 }}>{desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const SocialProof: React.FC = () => (
  <section id="confianza" className="cream grain">
    <div className="wrap" style={{ paddingBlock: 'clamp(64px,9vw,110px)' }}>
      <div style={{ maxWidth: '34em' }}>
        <p className="eyebrow reveal">Por qué FactuMovil</p>
        <h2 className="disp reveal" style={{ margin: '14px 0 0', color: 'var(--cream-ink)' }}>Hecho para quien factura todos los días.</h2>
        <p className="lead reveal" style={{ margin: '18px 0 0' }}>Sin trucos ni letra chica. Esto es lo que hace por ti.</p>
      </div>
      <div className="tests-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, marginTop: 44 }}>
        {guarantees.map(({ icon: Icon, title, desc }) => (
          <div className="t-card reveal" key={title}>
            <span style={{ display: 'grid', placeItems: 'center', width: 46, height: 46, borderRadius: 13, background: 'rgba(44,75,245,.1)', color: 'var(--blue-2)' }}><Icon /></span>
            <h3 className="disp" style={{ fontSize: '1.2rem', margin: '16px 0 0', color: 'var(--cream-ink)' }}>{title}</h3>
            <p style={{ margin: '.5rem 0 0', color: 'var(--cream-mut)', fontSize: '.95rem', lineHeight: 1.5 }}>{desc}</p>
          </div>
        ))}
      </div>
      <div className="reveal" style={{ marginTop: 48, borderTop: '1px solid var(--line-cream)', paddingTop: 28, display: 'flex', flexWrap: 'wrap', gap: '14px 32px', alignItems: 'center' }}>
        <span className="eyebrow" style={{ color: 'var(--cream-mut)' }}>Comprobantes aceptados</span>
        <span className="dt"><FileText /> Factura</span>
        <span className="dt"><Receipt /> Boleta de venta</span>
        <span className="dt"><FileMinus /> Nota de crédito</span>
        <span className="dt"><FilePlus /> Nota de débito</span>
      </div>
    </div>
  </section>
);

const Transformation: React.FC = () => (
  <section className="grain" style={{ position: 'relative', paddingBlock: 'clamp(64px,9vw,120px)' }}>
    <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: 520, height: 420, borderRadius: 999, background: 'radial-gradient(circle,rgba(61,91,255,.18),transparent 65%)', filter: 'blur(20px)', pointerEvents: 'none' }} />
    <div className="wrap" style={{ position: 'relative' }}>
      <div style={{ maxWidth: '32em' }}>
        <p className="eyebrow reveal" style={{ color: 'var(--blue)' }}>Transformación</p>
        <h2 className="disp reveal" style={{ margin: '16px 0 0' }}>Del portal de SUNAT, a tu bolsillo.</h2>
      </div>
      <div className="trans-grid" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 24, alignItems: 'center', marginTop: 48 }}>
        <div className="reveal" style={{ border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: 28, background: 'rgba(255,255,255,.02)' }}>
          <span className="eyebrow" style={{ color: 'var(--mut)' }}>Antes</span>
          <ul style={{ listStyle: 'none', margin: '18px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {transformBefore.map(({ icon: Icon, text }) => (
              <li className="ba" key={text}><span className="ba-ic"><Icon /></span><span>{text}</span></li>
            ))}
          </ul>
        </div>
        <div className="reveal trans-arrow" style={{ display: 'grid', placeItems: 'center', width: 56, height: 56, borderRadius: 999, background: 'var(--blue)', color: '#fff', boxShadow: '0 14px 30px -8px rgba(61,91,255,.6)' }}>
          <ArrowRight style={{ width: 24, height: 24 }} />
        </div>
        <div className="reveal" style={{ border: '1px solid rgba(61,91,255,.4)', borderRadius: 'var(--r)', padding: 28, background: 'linear-gradient(180deg,rgba(61,91,255,.1),rgba(61,91,255,.02))' }}>
          <span className="eyebrow" style={{ color: 'var(--blue)' }}>Después</span>
          <ul style={{ listStyle: 'none', margin: '18px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {transformAfter.map(({ icon: Icon, text }) => (
              <li className="ba ok" key={text}><span className="ba-ic"><Icon /></span><span>{text}</span></li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  </section>
);

const FinalCTA: React.FC = () => (
  <section className="wrap" style={{ paddingBottom: 'clamp(64px,9vw,110px)' }}>
    <div className="grain" style={{ position: 'relative', overflow: 'hidden', borderRadius: 30, background: 'linear-gradient(135deg,#2C4BF5,#1b2fb0)', padding: 'clamp(48px,7vw,88px) clamp(28px,5vw,72px)', textAlign: 'center' }}>
      <div className="dotgrid" style={{ position: 'absolute', inset: 0, opacity: .5, WebkitMaskImage: 'radial-gradient(ellipse at 50% 0%,#000,transparent 70%)', maskImage: 'radial-gradient(ellipse at 50% 0%,#000,transparent 70%)' }} />
      <div style={{ position: 'relative' }}>
        <span className="pill mono" style={{ background: 'rgba(255,255,255,.12)', borderColor: 'rgba(255,255,255,.25)', color: '#fff', letterSpacing: '.12em', textTransform: 'uppercase', fontSize: '.72rem' }}><Sparkles style={{ width: 14, height: 14 }} /> Facturación con IA</span>
        <h2 className="disp" style={{ margin: '22px auto 0', maxWidth: '14em', color: '#fff', fontSize: 'clamp(2.2rem,5vw,4rem)' }}>Tu próxima factura, en segundos.</h2>
        <p style={{ margin: '18px auto 0', maxWidth: '30em', color: 'rgba(255,255,255,.82)', fontSize: '1.1rem' }}>
          Cuéntanos de tu negocio y te mostramos cómo emitir tu primer comprobante con IA. Te respondemos por WhatsApp.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 34 }}>
          <a className="btn" href={whatsappUrl} target="_blank" rel="noopener noreferrer" style={{ background: '#fff', color: 'var(--blue-2)' }}>Solicita tu demo <MessageCircle className="ar" /></a>
          <Link className="btn" to="/login" style={{ background: 'rgba(255,255,255,.12)', color: '#fff', border: '1px solid rgba(255,255,255,.3)' }}>Iniciar sesión</Link>
        </div>
      </div>
    </div>
  </section>
);

const Footer: React.FC = () => (
  <footer style={{ borderTop: '1px solid var(--line)' }}>
    <div className="wrap" style={{ paddingBlock: 56 }}>
      <div className="foot-grid" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: 40 }}>
        <div>
          <Wordmark />
          <p style={{ margin: '18px 0 0', color: 'var(--mut)', maxWidth: '24em', lineHeight: 1.6, fontSize: '.95rem' }}>
            Facturación electrónica para Perú, potenciada con IA. Emite facturas y boletas a SUNAT desde tu celular.
          </p>
        </div>
        <div className="fcol">
          <h4>Producto</h4>
          <a href="#solucion" onClick={goToSection('solucion')}>Solución</a>
          <a href="#como" onClick={goToSection('como')}>Cómo funciona</a>
          <a href="#confianza" onClick={goToSection('confianza')}>Confianza</a>
        </div>
        <div className="fcol">
          <h4>Empresa</h4>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">Contacto</a>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">Soporte</a>
          <Link to="/login">Iniciar sesión</Link>
        </div>
        <div className="fcol">
          <h4>Legal</h4>
          <a href="#">Términos</a>
          <a href="#">Privacidad</a>
        </div>
      </div>
      <div style={{ marginTop: 42, paddingTop: 24, borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, color: 'var(--mut)', fontSize: '.88rem' }}>
        <p style={{ margin: 0 }}>© {new Date().getFullYear()} FactuMovil AI. Todos los derechos reservados.</p>
        <div style={{ display: 'flex', gap: 6 }}>
          <a className="sico" href="mailto:jefferson@reditorial.es" aria-label="Correo"><Mail /></a>
          <a className="sico" href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><MessageCircle /></a>
          <a className="sico" href="https://facturamovilai.me" aria-label="Sitio web"><Globe /></a>
        </div>
      </div>
    </div>
  </footer>
);

const LandingPage: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const scroller = document.getElementById('root');
    if (!scroller) return;
    const onScroll = () => setScrolled(scroller.scrollTop > 10);
    scroller.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => scroller.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const reveals = Array.from(document.querySelectorAll<HTMLElement>('.landing-root .reveal'));
    reveals.forEach((el, i) => {
      el.classList.add('hide');
      el.style.transitionDelay = `${(i % 4) * 0.06}s`;
    });
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.remove('hide'); io.unobserve(e.target); }
      }),
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    reveals.forEach((el) => io.observe(el));
    const failsafe = window.setTimeout(() => reveals.forEach((el) => el.classList.remove('hide')), 1600);
    return () => { io.disconnect(); window.clearTimeout(failsafe); };
  }, []);

  return (
    <div id="top" className="landing-root select-text">
      <Nav scrolled={scrolled} />
      <main>
        <Hero />
        <Metrics />
        <Problem />
        <div className="wrap"><div className="perf" /></div>
        <Solution />
        <HowItWorks />
        <SocialProof />
        <Transformation />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
