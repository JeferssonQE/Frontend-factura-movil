// pages/AboutPage.tsx

import { Code2, Eye, type LucideIcon, Mail, MessageSquare, Phone, Target, Zap } from 'lucide-react';
import type React from 'react';
import Card from '../components/ui/Card';

const SERVICES = [
  {
    label: 'Facturación electrónica',
    desc: 'Sistema SUNAT integrado para boletas, facturas y notas de crédito.',
  },
  {
    label: 'Software a medida',
    desc: 'Desarrollamos aplicaciones web y móviles según las necesidades de tu negocio.',
  },
  {
    label: 'Integración con SUNAT',
    desc: 'Conexión directa con el portal SUNAT para emisión automática de comprobantes.',
  },
  {
    label: 'Consultoría tecnológica',
    desc: 'Te ayudamos a digitalizar tu negocio con las herramientas correctas.',
  },
];

const ContactLink: React.FC<{
  href: string;
  icon: LucideIcon;
  label: string;
  detail: string;
  external?: boolean;
  highlighted?: boolean;
}> = ({ href, icon: Icon, label, detail, external = false, highlighted = false }) => (
  <a
    href={href}
    {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    className={`flex items-center gap-3 rounded-control px-4 py-3 transition active:opacity-80 ${
      highlighted ? 'bg-success' : 'bg-white/10'
    }`}
  >
    <Icon size={18} className="shrink-0 text-white" />
    <div>
      <p className="text-sm font-semibold text-white">{label}</p>
      <p className="text-sm text-white/80">{detail}</p>
    </div>
  </a>
);

const InfoCard: React.FC<{
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}> = ({ icon: Icon, title, children }) => (
  <Card className="space-y-3 p-5">
    <div className="flex items-center gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-control bg-accent/10">
        <Icon size={18} className="text-accent" />
      </div>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
    </div>
    {children}
  </Card>
);

const AboutPage: React.FC = () => {
  return (
    <div className="space-y-5 pb-8">
      <Card className="flex items-center justify-center overflow-hidden p-6">
        <img src="/logo-horizontal-dark.png" alt="FactuMovil AI" className="h-auto w-full" />
      </Card>

      <InfoCard icon={Code2} title="Quiénes somos">
        <p className="text-sm leading-relaxed text-slate-600">
          Somos un equipo de desarrollo especializado en{' '}
          <span className="font-semibold text-slate-900">software a medida</span> para negocios
          peruanos. Usamos los nuevos estándares tecnológicos para estar siempre al día y ofrecer
          soluciones modernas, rápidas y simples.
        </p>
        <p className="text-sm leading-relaxed text-slate-600">
          FactuMovil AI nació de la necesidad real del empresario peruano: emitir boletas y facturas
          de forma fácil, sin complicaciones técnicas, desde cualquier dispositivo.
        </p>
      </InfoCard>

      <InfoCard icon={Target} title="Nuestra misión">
        <p className="text-sm leading-relaxed text-slate-600">
          Que emitir boletas y facturas{' '}
          <span className="font-semibold text-slate-900">ya no sea un problema</span> para el
          empresario peruano. Queremos que cualquier emprendedor, sin importar su conocimiento
          técnico, pueda facturar rápido y simple desde su celular.
        </p>
      </InfoCard>

      <InfoCard icon={Eye} title="Nuestra visión">
        <p className="text-sm leading-relaxed text-slate-600">
          Ser el sistema de facturación electrónica más simple y usado por los emprendedores del
          Perú, y crecer hacia otras áreas que impulsen la digitalización del negocio peruano:{' '}
          <span className="font-semibold text-slate-900">
            inventario, reportes, cobranzas y más
          </span>
          .
        </p>
      </InfoCard>

      <InfoCard icon={Zap} title="Nuestros servicios">
        <div className="space-y-4">
          {SERVICES.map((service) => (
            <div key={service.label} className="flex items-start gap-3">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-success" />
              <div>
                <p className="text-sm font-semibold text-slate-900">{service.label}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{service.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </InfoCard>

      <div className="space-y-4 rounded-card bg-primary p-5">
        <p className="text-base font-semibold text-white">Contáctanos</p>
        <p className="text-sm leading-relaxed text-white/70">
          ¿Tienes un proyecto en mente o necesitas una solución personalizada? Escríbenos, con gusto
          te atendemos.
        </p>

        <div className="space-y-3">
          <ContactLink
            href="https://wa.me/51963376546"
            icon={MessageSquare}
            label="WhatsApp"
            detail="+51 963 376 546"
            external
            highlighted
          />
          <ContactLink
            href="mailto:jefersson14qe@gmail.com"
            icon={Mail}
            label="Correo"
            detail="jefersson14qe@gmail.com"
          />
          <ContactLink
            href="tel:+51963376546"
            icon={Phone}
            label="Teléfono"
            detail="+51 963 376 546"
          />
        </div>

        <p className="pt-2 text-center text-xs text-white/50">
          FactuMovil AI © 2025 · Hecho en Perú
        </p>
      </div>
    </div>
  );
};

export default AboutPage;
