import React, { useState } from 'react';
import { ArrowLeft, Save, Send } from 'lucide-react';

interface FormularioPlaneacionProps {
  onBack: () => void;
}

type Modalidad = 'Directa' | 'Invitacion' | 'TDR';

interface Proponente {
  nombre: string;
  contacto: string;
  requisitosTecnicos: string;
  experiencia: string;
  criteriosHabilitantes: string;
  valorImpuestos: string;
  observaciones: string;
}

interface Invitado {
  nombre: string;
  contacto: string;
  valorCotizacion: string;
  plazo: string;
}

export function FormularioPlaneacion({ onBack }: FormularioPlaneacionProps) {
  const [modalidad, setModalidad] = useState<Modalidad>('Directa');

  // Fields for Directa — mirrors PDF F30-MA-GAF-02
  const [directa, setDirecta] = useState({
    fechaSolicitud: '',
    fechaComiteContrataciones: '',
    gerenciaSolicitante: '',
    supervisorContrato: '',
    fechaEstimadaSolicitud: '',
    fechaEstimadaRecepcion: '',
    objeto: '',
    justificacion: '',
    descripcionNecesidad: '',
    plazoEjecucion: '',
    lugarEjecucion: '',
    domicilio: 'Bogotá',
    modalidadSeleccion: '',
    presupuestoContratacion: '',
    rubroPresupuestal: '',
    formaPago: '',
    supervision: '',
    entregables: '',
    anexos: '',
    riesgos: '',
    criteriosAmbientales: '',
    conclusionesComite: 'Aprobada por unanimidad de los miembros del comité',
  });

  const [proponentes, setProponentes] = useState<Proponente[]>([
    { nombre: '', contacto: '', requisitosTecnicos: '', experiencia: '', criteriosHabilitantes: '', valorImpuestos: '', observaciones: '' },
    { nombre: '', contacto: '', requisitosTecnicos: '', experiencia: '', criteriosHabilitantes: '', valorImpuestos: '', observaciones: '' },
    { nombre: '', contacto: '', requisitosTecnicos: '', experiencia: '', criteriosHabilitantes: '', valorImpuestos: '', observaciones: '' },
    { nombre: '', contacto: '', requisitosTecnicos: '', experiencia: '', criteriosHabilitantes: '', valorImpuestos: '', observaciones: '' },
  ]);

  const updateProponente = (i: number, field: keyof Proponente, value: string) =>
    setProponentes(prev => prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));

  const addProponente = () =>
    setProponentes(prev => [...prev, { nombre: '', contacto: '', requisitosTecnicos: '', experiencia: '', criteriosHabilitantes: '', valorImpuestos: '', observaciones: '' }]);

  // Fields for Invitación / TDR (mirrors PDF structure)
  const [pdf, setPdf] = useState({
    nombreProceso: '',
    fechaSolicitud: '',
    gerenciaSolicitante: '',
    supervisorContrato: '',
    fechaEstimadaContrato: '',
    objeto: '',
    descripcionNecesidad: '',
    plazoEjecucion: '',
    lugarEjecucion: '',
    domicilio: '',
    serviciosOfertados: '',
    valorPromedio: '',
    plazoPromedio: '',
    plazoPromedioUnidad: 'dias',
    presupuestoOficial: '',
    presupuestoAprobado: '',
    rubroPresupuestal: '',
    formaPago: '',
    supervision: '',
    entregable1: '',
    entregable2: '',
    entregable3: '',
    anexos: '',
    riesgos: '',
    criteriosAmbientales: '',
  });

  const [invitados, setInvitados] = useState<Invitado[]>([
    { nombre: '', contacto: '', valorCotizacion: '', plazo: '' },
    { nombre: '', contacto: '', valorCotizacion: '', plazo: '' },
    { nombre: '', contacto: '', valorCotizacion: '', plazo: '' },
  ]);

  const updateInvitado = (i: number, field: keyof Invitado, value: string) =>
    setInvitados(prev => prev.map((inv, idx) => (idx === i ? { ...inv, [field]: value } : inv)));

  const addInvitado = () =>
    setInvitados(prev => [...prev, { nombre: '', contacto: '', valorCotizacion: '', plazo: '' }]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Solicitud enviada correctamente');
  };

  // ─── Shared PDF-style helpers ─────────────────────────────────────────────

  const SectionHeader = ({ title }: { title: string }) => (
    <div className="bg-[#E84922] text-white font-bold py-2 px-4 text-center text-xs uppercase tracking-wide">
      {title}
    </div>
  );

  const inp =
    'w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[var(--brand-secondary)] focus:border-transparent bg-white';
  const ta =
    'w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[var(--brand-secondary)] focus:border-transparent resize-none bg-white';

  interface FieldRowProps {
    label: string;
    labelW?: string;
    children: React.ReactNode;
  }
  const FieldRow = ({ label, labelW = 'w-52', children }: FieldRowProps) => (
    <div className="flex border-b border-gray-300 last:border-b-0">
      <div className={`${labelW} shrink-0 bg-gray-50 p-3 border-r border-gray-300 flex items-start`}>
        <span className="text-xs font-semibold text-gray-700">{label}</span>
      </div>
      <div className="flex-1 p-2">{children}</div>
    </div>
  );

  // ─── Full PDF form (Invitación & TDR) ─────────────────────────────────────

  const renderFormularioPDF = () => (
    <div className="border border-gray-300 rounded overflow-hidden">

      {/* ── Top header fields ── */}
      <FieldRow label="Nombre del proceso:">
        <input
          type="text"
          value={pdf.nombreProceso}
          onChange={e => setPdf({ ...pdf, nombreProceso: e.target.value })}
          className={inp}
          placeholder="Nombre del proceso de contratación"
        />
      </FieldRow>

      <div className="grid grid-cols-2 border-b border-gray-300">
        <div className="border-r border-gray-300">
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-700">Fecha de solicitud:</span>
          </div>
          <div className="p-2">
            <input type="date" value={pdf.fechaSolicitud} onChange={e => setPdf({ ...pdf, fechaSolicitud: e.target.value })} className={inp} />
          </div>
        </div>
        <div>
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-700">Modalidad de contratación:</span>
          </div>
          <div className="p-2 flex items-center">
            <span className="text-sm font-medium text-gray-900">{modalidad === 'Invitacion' ? 'Invitación' : 'TDR'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 border-b border-gray-300">
        <div className="border-r border-gray-300">
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-700">Gerencia solicitante:</span>
          </div>
          <div className="p-2">
            <select value={pdf.gerenciaSolicitante} onChange={e => setPdf({ ...pdf, gerenciaSolicitante: e.target.value })} className={inp}>
              <option value="">Seleccione la gerencia</option>
              <option>Gerencia Administrativa y Financiera</option>
              <option>Gerencia de Inversión</option>
              <option>Gerencia de Proyectos</option>
              <option>Gerencia Jurídica</option>
              <option>Dirección General</option>
            </select>
          </div>
        </div>
        <div>
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-700">Supervisor del contrato:</span>
          </div>
          <div className="p-2">
            <input
              type="text"
              value={pdf.supervisorContrato}
              onChange={e => setPdf({ ...pdf, supervisorContrato: e.target.value })}
              className={inp}
              placeholder="Nombre del supervisor"
            />
          </div>
        </div>
      </div>

      <FieldRow label="Fecha estimada en la que se requiere el contrato:" labelW="w-72">
        <input type="date" value={pdf.fechaEstimadaContrato} onChange={e => setPdf({ ...pdf, fechaEstimadaContrato: e.target.value })} className={inp} />
      </FieldRow>

      <FieldRow label="Objeto:">
        <textarea
          value={pdf.objeto}
          onChange={e => setPdf({ ...pdf, objeto: e.target.value })}
          rows={3}
          className={ta}
          placeholder="Indicar el objeto de la contratación requerida."
        />
      </FieldRow>

      {/* ── Sección I ── */}
      <SectionHeader title="I. Justificación y Descripción de la Necesidad" />
      <FieldRow label="Descripción de la necesidad:" labelW="w-52">
        <textarea
          value={pdf.descripcionNecesidad}
          onChange={e => setPdf({ ...pdf, descripcionNecesidad: e.target.value })}
          rows={5}
          className={ta}
          placeholder="Responde estas preguntas ¿qué necesitan?, ¿por qué lo necesitan?, y ¿cómo se relaciona con las actividades de Invest y del área?"
        />
      </FieldRow>

      {/* ── Sección II ── */}
      <SectionHeader title="II. Descripción del Plazo y Lugar de Ejecución" />
      <FieldRow label="2.1 Plazo de ejecución:">
        <input
          type="text"
          value={pdf.plazoEjecucion}
          onChange={e => setPdf({ ...pdf, plazoEjecucion: e.target.value })}
          className={inp}
          placeholder="X (días, meses, años) hasta el 31 de diciembre de xxxx"
        />
      </FieldRow>
      <FieldRow label="2.2 Lugar de ejecución:">
        <div className="space-y-2">
          <input
            type="text"
            value={pdf.lugarEjecucion}
            onChange={e => setPdf({ ...pdf, lugarEjecucion: e.target.value })}
            className={inp}
            placeholder="El lugar de ejecución del contrato será..."
          />
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600 shrink-0">PARÁGRAFO:</span>
            <input
              type="text"
              value={pdf.domicilio}
              onChange={e => setPdf({ ...pdf, domicilio: e.target.value })}
              className={inp}
              placeholder="Para todos los efectos contractuales se tendrán como domicilio la ciudad de..."
            />
          </div>
        </div>
      </FieldRow>

      {/* ── Datos de Contacto / Estudio de Mercado ── */}
      <SectionHeader title="Datos del Contacto / Estudio de Mercado" />

      <div className="p-3 text-xs text-gray-600 italic border-b border-gray-200">
        Ingresar la siguiente información de los posibles proponentes que puedan surtir la contratación.
      </div>

      {/* ─── Tabla INVITADOS (ancho completo) ─── */}
      <div className="border-b border-gray-300">
        <div className="bg-[#1a3a5c] text-white font-bold py-1.5 px-3 text-center text-xs uppercase tracking-wide">
          INVITADOS
        </div>

        {/* Encabezados de columna */}
        <div className="grid border-b border-gray-200 bg-[#dce8f5]" style={{ gridTemplateColumns: '2.5rem 1fr 1fr 1fr 8rem' }}>
          {['No.', 'Nombre del proveedor', 'Datos de contacto', 'Valor de cotización', 'Plazo'].map((h) => (
            <div key={h} className="py-1.5 px-2 border-r last:border-r-0 border-gray-300 text-center text-xs font-semibold text-gray-800">
              {h}
            </div>
          ))}
        </div>

        {/* Filas de invitados */}
        {invitados.map((inv, i) => (
          <div key={i} className="grid border-b border-gray-200" style={{ gridTemplateColumns: '2.5rem 1fr 1fr 1fr 8rem' }}>
            <div className="py-2 px-2 border-r border-gray-200 flex items-center justify-center text-sm text-gray-700 bg-gray-50 font-medium">
              {i + 1}
            </div>
            <div className="py-1.5 px-1.5 border-r border-gray-200">
              <input
                type="text"
                value={inv.nombre}
                onChange={e => updateInvitado(i, 'nombre', e.target.value)}
                className="w-full px-1.5 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-[var(--brand-secondary)]"
                placeholder="Nombre del proveedor"
              />
            </div>
            <div className="py-1.5 px-1.5 border-r border-gray-200">
              <input
                type="text"
                value={inv.contacto}
                onChange={e => updateInvitado(i, 'contacto', e.target.value)}
                className="w-full px-1.5 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-[var(--brand-secondary)]"
                placeholder="Email / Tel"
              />
            </div>
            <div className="py-1.5 px-1.5 border-r border-gray-200">
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">$</span>
                <input
                  type="text"
                  value={inv.valorCotizacion}
                  onChange={e => updateInvitado(i, 'valorCotizacion', e.target.value)}
                  className="w-full pl-5 pr-1.5 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-[var(--brand-secondary)]"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="py-1.5 px-1.5">
              <input
                type="number"
                value={inv.plazo}
                onChange={e => updateInvitado(i, 'plazo', e.target.value)}
                className="w-full px-1.5 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-[var(--brand-secondary)]"
                placeholder="0"
                min="0"
              />
            </div>
          </div>
        ))}

        {/* Botón agregar proponente */}
        <div className="p-2 flex justify-end bg-gray-50">
          <button
            type="button"
            onClick={addInvitado}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1a3a5c] border border-[#1a3a5c] rounded hover:bg-[#1a3a5c] hover:text-white transition-colors"
          >
            + Agregar proponente
          </button>
        </div>
      </div>

      {/* ─── Sección ANÁLISIS DEL MERCADO ─── */}
      <div className="border-b border-gray-300">
        <div className="bg-[#1a3a5c] text-white font-bold py-1.5 px-3 text-center text-xs uppercase tracking-wide">
          ANÁLISIS DEL MERCADO
        </div>

        {/* Servicios ofertados */}
        <div className="border-b border-gray-200">
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-700">SERVICIOS OFERTADOS</span>
          </div>
          <div className="p-3">
            <textarea
              value={pdf.serviciosOfertados}
              onChange={e => setPdf({ ...pdf, serviciosOfertados: e.target.value })}
              rows={5}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[var(--brand-secondary)] resize-none bg-white"
              placeholder="Definir si el oferente presta la totalidad de servicios solicitados y si encontró algún valor agregado."
            />
          </div>
        </div>

        {/* Valor promedio + Plazo promedio lado a lado */}
        <div className="grid grid-cols-2 border-b border-gray-200">
          <div className="border-r border-gray-300">
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
              <span className="text-xs font-semibold text-gray-700">VALOR PROMEDIO</span>
            </div>
            <div className="p-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none font-medium">$</span>
                <input
                  type="text"
                  value={pdf.valorPromedio}
                  onChange={e => setPdf({ ...pdf, valorPromedio: e.target.value })}
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[var(--brand-secondary)] bg-white"
                  placeholder="0"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Promedio de los valores obtenidos en el estudio de mercado.</p>
            </div>
          </div>
          <div>
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
              <span className="text-xs font-semibold text-gray-700">PLAZO PROMEDIO</span>
            </div>
            <div className="p-3">
              <div className="flex gap-2">
                <input
                  type="number"
                  value={pdf.plazoPromedio}
                  onChange={e => setPdf({ ...pdf, plazoPromedio: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[var(--brand-secondary)] bg-white"
                  placeholder="0"
                  min="0"
                  step="1"
                />
                <select
                  value={pdf.plazoPromedioUnidad}
                  onChange={e => setPdf({ ...pdf, plazoPromedioUnidad: e.target.value })}
                  className="w-28 px-2 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[var(--brand-secondary)] bg-white"
                >
                  <option value="dias">días</option>
                  <option value="meses">meses</option>
                </select>
              </div>
              <p className="text-xs text-gray-400 mt-1">Promedio de los plazos obtenidos en la investigación.</p>
            </div>
          </div>
        </div>

        {/* Presupuesto oficial */}
        <div>
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-700">PRESUPUESTO OFICIAL</span>
          </div>
          <div className="p-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none font-medium">$</span>
              <input
                type="text"
                value={pdf.presupuestoOficial}
                onChange={e => setPdf({ ...pdf, presupuestoOficial: e.target.value })}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[var(--brand-secondary)] bg-white"
                placeholder="0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Sección IV ── */}
      <SectionHeader title="IV. Análisis del Valor Estimado del Contrato, Presupuesto y Forma de Pago" />
      <FieldRow label="4.1 Presupuesto aprobado:" labelW="w-56">
        <textarea
          value={pdf.presupuestoAprobado}
          onChange={e => setPdf({ ...pdf, presupuestoAprobado: e.target.value })}
          rows={3}
          className={ta}
          placeholder="A efectos de estimar el presupuesto del presente proceso de selección, se adelantó un estudio de mercado, en donde se estimó que el valor para contratar..."
        />
      </FieldRow>
      <FieldRow label="4.2 Rubro presupuestal:" labelW="w-56">
        <input
          type="text"
          value={pdf.rubroPresupuestal}
          onChange={e => setPdf({ ...pdf, rubroPresupuestal: e.target.value })}
          className={inp}
          placeholder="Indique el rubro presupuestal que será la fuente de los recursos."
        />
      </FieldRow>
      <FieldRow label="4.3 Forma de pago:" labelW="w-56">
        <textarea
          value={pdf.formaPago}
          onChange={e => setPdf({ ...pdf, formaPago: e.target.value })}
          rows={2}
          className={ta}
          placeholder="Indicar la forma de pago de acuerdo con la modalidad de contratación..."
        />
      </FieldRow>

      {/* ── Sección V ── */}
      <SectionHeader title="V. Supervisión y Entregables del Contrato" />
      <FieldRow label="5.1 Supervisión:" labelW="w-56">
        <textarea
          value={pdf.supervision}
          onChange={e => setPdf({ ...pdf, supervision: e.target.value })}
          rows={2}
          className={ta}
          placeholder="La supervisión del contrato estará a cargo del..."
        />
      </FieldRow>

      {/* 5.2 Entregables – 3 columnas */}
      <div className="flex border-b border-gray-300">
        <div className="w-56 shrink-0 bg-gray-50 p-3 border-r border-gray-300 flex items-start">
          <span className="text-xs font-semibold text-gray-700">5.2 Entregables:</span>
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-3 border-b border-gray-200 bg-gray-100">
            {[
              '1. Cronograma del evento',
              '2. Evento',
              '3. Informe de resultado',
            ].map((h) => (
              <div key={h} className="py-1.5 px-2 border-r last:border-r-0 border-gray-200 text-xs font-semibold text-gray-700 text-center">
                {h}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3">
            {(['entregable1', 'entregable2', 'entregable3'] as const).map((key, idx) => (
              <div key={key} className={`p-2 ${idx < 2 ? 'border-r border-gray-200' : ''}`}>
                <textarea
                  value={pdf[key]}
                  onChange={e => setPdf({ ...pdf, [key]: e.target.value })}
                  rows={3}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs resize-none"
                  placeholder="Contenido, porcentaje a pagar con este entregable..."
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Sección VI ── */}
      <SectionHeader title="VI. Anexos" />
      <FieldRow label="6.1 Anexos:" labelW="w-56">
        <textarea
          value={pdf.anexos}
          onChange={e => setPdf({ ...pdf, anexos: e.target.value })}
          rows={3}
          className={ta}
          placeholder="Relacionar todos los documentos que se hayan generado o tenido en cuenta para la elaboración del presente estudio previo."
        />
      </FieldRow>

      {/* ── Sección VII ── */}
      <SectionHeader title="VII. Riesgos y Criterios Ambientales o de SST" />
      <FieldRow label="7.1 Riesgos:" labelW="w-56">
        <textarea
          value={pdf.riesgos}
          onChange={e => setPdf({ ...pdf, riesgos: e.target.value })}
          rows={4}
          className={ta}
          placeholder={'Ejemplo: Para suministros: "Riesgo de desabastecimiento, incumplimiento en tiempos de entrega, variación de precios". Para servicios: "Incumplimiento en la calidad del servicio, rotación del personal clave".'}
        />
      </FieldRow>
      <FieldRow label="7.1 Criterios ambientales/SST:" labelW="w-56">
        <textarea
          value={pdf.criteriosAmbientales}
          onChange={e => setPdf({ ...pdf, criteriosAmbientales: e.target.value })}
          rows={3}
          className={ta}
          placeholder="Teniendo en cuenta las características de la contratación a solicitar, describa los requerimientos ambientales o de SST que se deban exigir al contratista."
        />
      </FieldRow>
    </div>
  );

  // ─── Directa — PDF F30-MA-GAF-02 ─────────────────────────────────────────

  const renderDirecta = () => (
    <div className="border border-gray-300 rounded overflow-hidden">

      {/* ── Header fields grid ── */}
      <div className="grid grid-cols-2 border-b border-gray-300">
        <div className="border-r border-gray-300">
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-700">Fecha de solicitud:</span>
          </div>
          <div className="p-2">
            <input type="date" value={directa.fechaSolicitud} onChange={e => setDirecta({ ...directa, fechaSolicitud: e.target.value })} className={inp} />
            <p className="text-xs text-gray-400 mt-1 italic">Indicar fecha de solicitud al Gerente del Área Solicitante.</p>
          </div>
        </div>
        <div>
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-700">Fecha del Comité de contrataciones:</span>
          </div>
          <div className="p-2">
            <input type="date" value={directa.fechaComiteContrataciones} onChange={e => setDirecta({ ...directa, fechaComiteContrataciones: e.target.value })} className={inp} />
            <p className="text-xs text-gray-400 mt-1 italic">Indicar fecha de aprobación del documento por parte del Comité de contrataciones.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 border-b border-gray-300">
        <div className="border-r border-gray-300">
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-700">Gerencia solicitante:</span>
          </div>
          <div className="p-2">
            <select value={directa.gerenciaSolicitante} onChange={e => setDirecta({ ...directa, gerenciaSolicitante: e.target.value })} className={inp}>
              <option value="">Seleccione la gerencia</option>
              <option>Gerencia Administrativa y Financiera</option>
              <option>Gerencia de Inversión</option>
              <option>Gerencia de Proyectos</option>
              <option>Gerencia Jurídica</option>
              <option>Dirección General</option>
            </select>
          </div>
        </div>
        <div>
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-700">Supervisor del contrato:</span>
          </div>
          <div className="p-2">
            <input type="text" value={directa.supervisorContrato} onChange={e => setDirecta({ ...directa, supervisorContrato: e.target.value })} className={inp} placeholder="Indicar nombre del empleado que ejercerá la supervisión" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 border-b border-gray-300">
        <div className="border-r border-gray-300">
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-700">Fecha estimada solicitud de propuestas:</span>
          </div>
          <div className="p-2">
            <input type="date" value={directa.fechaEstimadaSolicitud} onChange={e => setDirecta({ ...directa, fechaEstimadaSolicitud: e.target.value })} className={inp} />
            <p className="text-xs text-gray-400 mt-1 italic">Enviar la información a GAF mínimo con dos (2) días de anticipación.</p>
          </div>
        </div>
        <div>
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-700">Fecha estimada recepción de propuestas:</span>
          </div>
          <div className="p-2">
            <input type="date" value={directa.fechaEstimadaRecepcion} onChange={e => setDirecta({ ...directa, fechaEstimadaRecepcion: e.target.value })} className={inp} />
            <p className="text-xs text-gray-400 mt-1 italic">A los proponentes se le otorgará mínimo dos (2) días para el envío de sus propuestas.</p>
          </div>
        </div>
      </div>

      <FieldRow label="Objeto:">
        <textarea value={directa.objeto} onChange={e => setDirecta({ ...directa, objeto: e.target.value })} rows={3} className={ta} placeholder="Indicar el objeto de la contratación requerida." />
      </FieldRow>

      {/* ── Sección I ── */}
      <SectionHeader title="I. Justificación y Descripción de la Necesidad" />
      <FieldRow label="1.1 Justificación:" labelW="w-52">
        <textarea
          value={directa.justificacion}
          onChange={e => setDirecta({ ...directa, justificacion: e.target.value })}
          rows={5}
          className={ta}
          placeholder="En este apartado se redactará la justificación por la cual se requiere el objeto a contratar, indicando la necesidad a satisfacer de conformidad con el propósito superior de La Corporación, objetivos y metas de los cual se deriva la contratación, así como las funciones del área solicitante."
        />
      </FieldRow>
      <FieldRow label="1.2 Descripción de la necesidad:" labelW="w-52">
        <textarea value={directa.descripcionNecesidad} onChange={e => setDirecta({ ...directa, descripcionNecesidad: e.target.value })} rows={4} className={ta} placeholder="Describa la necesidad a satisfacer." />
      </FieldRow>

      {/* ── Sección II ── */}
      <SectionHeader title="II. Descripción del Plazo y Lugar de Ejecución" />
      <FieldRow label="2.1 Plazo de ejecución:">
        <input type="text" value={directa.plazoEjecucion} onChange={e => setDirecta({ ...directa, plazoEjecucion: e.target.value })} className={inp} placeholder="El plazo de ejecución del contrato será desde XX hasta XXXX" />
      </FieldRow>
      <FieldRow label="2.2 Lugar de ejecución:">
        <div className="space-y-2">
          <input type="text" value={directa.lugarEjecucion} onChange={e => setDirecta({ ...directa, lugarEjecucion: e.target.value })} className={inp} placeholder="El lugar de ejecución del contrato será Bogotá" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600 shrink-0">PARÁGRAFO:</span>
            <input type="text" value={directa.domicilio} onChange={e => setDirecta({ ...directa, domicilio: e.target.value })} className={inp} placeholder="Para todos los efectos contractuales se tendrán como domicilio la ciudad de Bogotá" />
          </div>
        </div>
      </FieldRow>

      {/* ── Sección III — Investigación de Mercado ── */}
      <SectionHeader title="III. Investigación de Mercado" />
      <div className="p-3 text-xs text-gray-600 italic border-b border-gray-200">
        Ingresar la siguiente información de los posibles proponentes que puedan suplir la contratación descrita en el presente documento.
      </div>

      {/* Tabla de proponentes — 8 columnas del PDF */}
      <div className="border-b border-gray-300 overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="grid border-b border-gray-200 bg-[#E84922]" style={{ gridTemplateColumns: '2.5rem 1fr 1fr 1fr 1fr 1fr 1fr 1fr' }}>
            {['No.', 'Nombre del proveedor', 'Datos de contacto', 'Requisitos técnicos', 'Experiencia', 'Criterios habilitantes', 'Valor + Impuestos', 'Anexo / Observaciones'].map((h) => (
              <div key={h} className="py-1.5 px-2 border-r last:border-r-0 border-red-400 text-center text-xs font-semibold text-white">
                {h}
              </div>
            ))}
          </div>

          {proponentes.map((p, i) => (
            <div key={i} className="grid border-b border-gray-200" style={{ gridTemplateColumns: '2.5rem 1fr 1fr 1fr 1fr 1fr 1fr 1fr' }}>
              <div className="py-2 px-2 border-r border-gray-200 flex items-center justify-center text-sm font-medium bg-gray-50 text-gray-700">{i + 1}</div>
              {(['nombre', 'contacto', 'requisitosTecnicos', 'experiencia', 'criteriosHabilitantes', 'valorImpuestos', 'observaciones'] as (keyof Proponente)[]).map((field, fi) => (
                <div key={field} className={`py-1.5 px-1.5 ${fi < 6 ? 'border-r border-gray-200' : ''}`}>
                  <textarea
                    value={p[field]}
                    onChange={e => updateProponente(i, field, e.target.value)}
                    rows={2}
                    className="w-full px-1.5 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-[var(--brand-secondary)] resize-none"
                  />
                </div>
              ))}
            </div>
          ))}

          <div className="p-2 flex justify-end bg-gray-50">
            <button type="button" onClick={addProponente} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#E84922] border border-[#E84922] rounded hover:bg-[#E84922] hover:text-white transition-colors">
              + Agregar proponente
            </button>
          </div>
        </div>
      </div>

      {/* ── Sección IV ── */}
      <SectionHeader title="IV. Identificación del Contrato a Celebrar y Modalidad de Selección" />
      <div className="p-3 text-xs text-gray-600 italic border-b border-gray-200">
        Si, conforme con los resultados del apartado anterior "III. Investigación de mercado", la contratación se debe realizar de manera directa, seleccione la causal que justifique la modalidad de contratación, de acuerdo con lo indicado en el ítem a) del numeral 5.2.1, 'Modalidades de contrataciones', del MA-GAF-01 Manual de Procedimientos de Compras y Contratación:
      </div>
      <FieldRow label="4.1 Modalidad de selección:" labelW="w-56">
        <select value={directa.modalidadSeleccion} onChange={e => setDirecta({ ...directa, modalidadSeleccion: e.target.value })} className={inp}>
          <option value="">Seleccione la causal de contratación directa</option>
          <option value="unico_proveedor">Proveedor o contratista único</option>
          <option value="urgencia_manifiesta">Urgencia manifiesta</option>
          <option value="cuantia_menor">Cuantía menor al límite establecido</option>
          <option value="confidencialidad">Razones de seguridad o confidencialidad</option>
          <option value="interadministrativo">Contrato interadministrativo</option>
          <option value="otro">Otro</option>
        </select>
      </FieldRow>

      {/* ── Sección V ── */}
      <SectionHeader title="V. Análisis del Valor Estimado del Contrato, Presupuesto y Forma de Pago" />
      <FieldRow label="5.1 Presupuesto para la contratación:" labelW="w-64">
        <textarea value={directa.presupuestoContratacion} onChange={e => setDirecta({ ...directa, presupuestoContratacion: e.target.value })} rows={4} className={ta} placeholder="A efectos de estimar el presupuesto del presente proceso de selección, se adelantó un estudio de mercado, en donde se estimó que el valor para contratar xxxxxxxx (transcribir el objeto a contratar) es hasta la suma de xxxxxxx M/CTE ($ xxx), tal como se evidencia en el documento anexo xxxxxxxx (nombre del documento adjunto), el cual forma parte integral del presente documento." />
      </FieldRow>
      <FieldRow label="5.2 Rubro presupuestal:" labelW="w-64">
        <textarea value={directa.rubroPresupuestal} onChange={e => setDirecta({ ...directa, rubroPresupuestal: e.target.value })} rows={2} className={ta} placeholder="Indique el rubro presupuestal el cual será la fuente de los recursos. El valor del contrato se encuentra respaldado por la disponibilidad presupuestal y/o vigencia futura, que se relaciona a continuación." />
      </FieldRow>
      <FieldRow label="5.3 Forma de pago:" labelW="w-64">
        <textarea value={directa.formaPago} onChange={e => setDirecta({ ...directa, formaPago: e.target.value })} rows={2} className={ta} placeholder="Indicar la forma de pago de acuerdo con la modalidad de contratación y la ejecución esperada del contrato, en caso de haber anticipo o pago anticipado, realizar la debida justificación." />
      </FieldRow>

      {/* ── Sección VI ── */}
      <SectionHeader title="VI. Supervisión y Entregables del Contrato" />
      <FieldRow label="6.1 Supervisión:" labelW="w-56">
        <textarea value={directa.supervision} onChange={e => setDirecta({ ...directa, supervision: e.target.value })} rows={2} className={ta} placeholder="La supervisión del contrato estará a cargo de..." />
      </FieldRow>
      <FieldRow label="6.2 Entregables:" labelW="w-56">
        <textarea value={directa.entregables} onChange={e => setDirecta({ ...directa, entregables: e.target.value })} rows={4} className={ta} placeholder="Describir los entregables establecidos con el proveedor/contratista, que demuestren la ejecución del contrato." />
      </FieldRow>

      {/* ── Sección VII ── */}
      <SectionHeader title="VII. Anexos" />
      <FieldRow label="7.1 Anexos:" labelW="w-56">
        <textarea value={directa.anexos} onChange={e => setDirecta({ ...directa, anexos: e.target.value })} rows={3} className={ta} placeholder="Relacionar todos los documentos que se hayan generado o tenido en cuenta para la elaboración del presente estudio previo." />
      </FieldRow>

      {/* ── Sección VIII ── */}
      <SectionHeader title="VIII. Riesgos y Criterios Ambientales o de SST" />
      <FieldRow label="8.1 Riesgos:" labelW="w-56">
        <textarea value={directa.riesgos} onChange={e => setDirecta({ ...directa, riesgos: e.target.value })} rows={4} className={ta} placeholder='El riesgo "es un evento que puede generar efectos adversos y de distinta magnitud en el logro de los objetivos del Proceso de Contratación o en la ejecución de un Contrato". Por lo anterior, describa los posibles riesgos que se podrían presentar en la etapa precontractual, contractual y de ejecución del proceso de contratación.' />
      </FieldRow>
      <FieldRow label="8.2 Criterios ambientales/SST:" labelW="w-56">
        <textarea value={directa.criteriosAmbientales} onChange={e => setDirecta({ ...directa, criteriosAmbientales: e.target.value })} rows={3} className={ta} placeholder="Teniendo en cuenta las características de la contratación a solicitar, describa los requerimientos ambientales o de seguridad y salud en el trabajo que se deban exigir al contratista o proveedor (si aplica)." />
      </FieldRow>

      {/* ── Sección IX ── */}
      <SectionHeader title="IX. Conclusiones por Parte del Comité de Contrataciones" />
      <FieldRow label="9.1 Conclusiones del Comité:" labelW="w-56">
        <textarea value={directa.conclusionesComite} onChange={e => setDirecta({ ...directa, conclusionesComite: e.target.value })} rows={3} className={ta} placeholder="Indicar las conclusiones y si la contratación del presente documento fue aprobada por el Comité de contrataciones." />
      </FieldRow>
    </div>
  );

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft size={20} />
          Volver al Dashboard
        </button>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-2">
          Formato Planeación Contractual
        </h1>
        <p className="text-slate-500 font-medium">F30-MA-GAF-02 · Versión 1 · Diciembre 2024</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-5xl space-y-6">

        {/* Modalidad selector */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Modalidad de Contratación <span className="text-red-600">*</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['Directa', 'Invitacion', 'TDR'] as Modalidad[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModalidad(m)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  modalidad === m
                    ? 'border-[var(--brand-secondary)] bg-blue-50'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                <p className="font-semibold text-gray-900">
                  {m === 'Invitacion' ? 'Invitación' : m}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {m === 'Directa' && 'Sin proceso de selección'}
                  {m === 'Invitacion' && '< 25 SMLV'}
                  {m === 'TDR' && '≥ 25 SMLV'}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Form content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:p-8">
          {modalidad === 'Directa' ? renderDirecta() : renderFormularioPDF()}

          {/* Action buttons */}
          <div className="border-t border-gray-200 pt-6 mt-8 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="button"
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-[var(--brand-secondary)] text-[var(--brand-secondary)] rounded-lg hover:bg-blue-50 transition-colors font-medium"
            >
              <Save size={20} />
              Guardar Borrador
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#E84922] text-white rounded-lg hover:bg-[#C73D1C] transition-colors font-medium shadow-md"
            >
              <Send size={20} />
              Enviar Solicitud
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
