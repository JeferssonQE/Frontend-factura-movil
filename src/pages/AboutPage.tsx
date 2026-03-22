// pages/AboutPage.tsx
import React from 'react';
import { Zap, Target, Eye, Code2, Phone, Mail, MessageSquare } from 'lucide-react';

const ASCII_LOGO = `
╔══════════════════════════╗
║   F A C T U M O V I L   ║
║   ─────────────────────  ║
║      A I  ·  P E R Ú    ║
╚══════════════════════════╝`.trim();

const AboutPage: React.FC = () => {
  return (
    <div className="space-y-5 pb-8">

      {/* Hero ASCII */}
      <div className="bg-slate-900 rounded-[24px] p-6 flex flex-col items-center gap-4">
        <pre className="text-emerald-400 text-[10px] leading-snug font-mono text-center select-none">
          {ASCII_LOGO}
        </pre>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] text-center">
          Software a medida · Innovación · Perú
        </p>
      </div>

      {/* Quiénes somos */}
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center shrink-0">
            <Code2 size={18} className="text-violet-600" />
          </div>
          <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Quiénes Somos</h2>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          Somos un equipo de desarrollo especializado en <span className="font-bold text-slate-800">software a medida</span> para negocios peruanos. Usamos los nuevos estándares tecnológicos para estar siempre al día y ofrecer soluciones modernas, rápidas y simples.
        </p>
        <p className="text-sm text-slate-600 leading-relaxed">
          FactuMovil AI nació de la necesidad real del empresario peruano: emitir boletas y facturas de forma fácil, sin complicaciones técnicas, desde cualquier dispositivo.
        </p>
      </div>

      {/* Misión */}
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
            <Target size={18} className="text-blue-600" />
          </div>
          <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Nuestra Misión</h2>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          Que emitir boletas y facturas <span className="font-bold text-slate-800">ya no sea un problema</span> para el empresario peruano. Queremos que cualquier emprendedor, sin importar su conocimiento técnico, pueda facturar rápido y simple desde su celular.
        </p>
      </div>

      {/* Visión */}
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
            <Eye size={18} className="text-amber-500" />
          </div>
          <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Nuestra Visión</h2>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          Ser el sistema de facturación electrónica más simple y usado por los emprendedores del Perú, y crecer hacia otras áreas que impulsen la digitalización del negocio peruano: <span className="font-bold text-slate-800">inventario, reportes, cobranzas y más</span>.
        </p>
      </div>

      {/* Servicios */}
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
            <Zap size={18} className="text-emerald-600" />
          </div>
          <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Nuestros Servicios</h2>
        </div>

        {[
          { label: 'Facturación Electrónica', desc: 'Sistema SUNAT integrado para boletas, facturas y notas de crédito.' },
          { label: 'Software a Medida', desc: 'Desarrollamos aplicaciones web y móviles según las necesidades de tu negocio.' },
          { label: 'Integración con SUNAT', desc: 'Conexión directa con el portal SUNAT para emisión automática de comprobantes.' },
          { label: 'Consultoría Tecnológica', desc: 'Te ayudamos a digitalizar tu negocio con las herramientas correctas.' },
        ].map((s) => (
          <div key={s.label} className="flex gap-3 items-start">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <div>
              <p className="text-[11px] font-black text-slate-800 uppercase tracking-wide">{s.label}</p>
              <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Contacto */}
      <div className="bg-slate-900 rounded-[24px] p-5 space-y-4">
        <p className="text-[11px] font-black text-white uppercase tracking-widest">Contáctanos</p>
        <p className="text-xs text-slate-400 leading-relaxed">
          ¿Tienes un proyecto en mente o necesitas una solución personalizada? Escríbenos, con gusto te atendemos.
        </p>

        <div className="space-y-3">
          <a
            href="https://wa.me/51963376546"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-emerald-500 rounded-2xl px-4 py-3 active:opacity-80 transition-opacity"
          >
            <MessageSquare size={18} className="text-white shrink-0" />
            <div>
              <p className="text-[10px] font-black text-white uppercase tracking-widest">WhatsApp</p>
              <p className="text-[11px] text-emerald-100">+51 963 376 546</p>
            </div>
          </a>

          <a
            href="mailto:jefersson14qe@gmail.com"
            className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-3 active:opacity-80 transition-opacity"
          >
            <Mail size={18} className="text-white shrink-0" />
            <div>
              <p className="text-[10px] font-black text-white uppercase tracking-widest">Correo</p>
              <p className="text-[11px] text-slate-300">jefersson14qe@gmail.com</p>
            </div>
          </a>

          <a
            href="tel:+51963376546"
            className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-3 active:opacity-80 transition-opacity"
          >
            <Phone size={18} className="text-white shrink-0" />
            <div>
              <p className="text-[10px] font-black text-white uppercase tracking-widest">Teléfono</p>
              <p className="text-[11px] text-slate-300">+51 963 376 546</p>
            </div>
          </a>
        </div>

        <p className="text-center text-[9px] font-black text-slate-600 uppercase tracking-widest pt-2">
          FactuMovil AI © 2025 · Hecho en Perú
        </p>
      </div>

    </div>
  );
};

export default AboutPage;
