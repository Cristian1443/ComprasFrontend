import { apiFetch } from '../../lib/apiClient';
import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  Users,
  ArrowUpRight,
  Clock,
  CheckCircle,
  Loader2
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface DashboardProps {
  userName: string;
  initialMetrics?: any;
  isLoading?: boolean;
}

export function DashboardFinanciera({ userName, initialMetrics, isLoading }: DashboardProps) {
  const [loading, setLoading] = useState(isLoading ?? true);
  const [metrics, setMetrics] = useState<any>(initialMetrics || null);

  const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    if (initialMetrics) {
      setMetrics(initialMetrics);
      setLoading(false);
      return;
    }

    const fetchMetrics = async () => {
      try {
        const res = await apiFetch(`${API_URL}/api/financiera/metrics`);
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch (err) {
        console.error('Error fetching dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [initialMetrics]);

  useEffect(() => {
    setLoading(isLoading ?? false);
  }, [isLoading]);

  const formatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  });

  if (loading && !metrics) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="w-12 h-12 text-[#10B981] animate-spin" />
        <p className="text-slate-500 font-bold font-gabarito">Cargando inteligencia financiera...</p>
      </div>
    );
  }

  const stats = [
    {
      label: 'Bandeja de Entrada',
      val: metrics?.stats?.pendientes || '0',
      icon: Clock,
      color: 'from-amber-500 to-orange-400',
      trend: 'Por revisar'
    },
    {
      label: 'Total Gestión',
      val: metrics?.stats?.aprobadas || '0',
      icon: CheckCircle,
      color: 'from-emerald-600 to-teal-500',
      trend: 'Solicitudes aprobadas'
    },
    {
      label: 'Presupuesto Movilizado',
      val: formatter.format(metrics?.stats?.valor_total || 0),
      icon: DollarSign,
      color: 'from-emerald-700 to-emerald-500',
      trend: 'Impacto total'
    },
    {
      label: 'Solicitantes Activos',
      val: metrics?.stats?.solicitantes || '0',
      icon: Users,
      color: 'from-emerald-800 to-emerald-600',
      trend: 'Usuarios únicos'
    }
  ];

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700 min-h-full" style={{ backgroundColor: 'var(--ui-bg)' }}>
      {/* Top Bar / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Gabarito, sans-serif' }}>
            <span className="text-[#E84922]">Hola,</span> {userName.split(' ')[0]}
          </h1>
          <p className="text-slate-500 font-medium italic">
            Visualización central de rubros y ejecución presupuestal corporativa.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
          <div className="p-2 bg-red-50 rounded-xl">
            <TrendingUp className="text-[#E84922]" size={20} />
          </div>
          <div className="pr-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">Status Global</p>
            <p className="text-sm font-bold text-slate-700 leading-none mt-1">Óptimo Fiscal</p>
          </div>
        </div>
      </div>

      {/* Smart Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="group relative bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 transition-all duration-300 hover:shadow-lg hover:translate-y-[-2px]">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-[0.03] rounded-bl-[4rem]`}></div>
            <div className="flex justify-between items-start mb-4">
              <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
                <stat.icon size={22} />
              </div>
              <ArrowUpRight className="text-slate-200 group-hover:text-emerald-500 transition-colors" size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">{stat.label}</p>
            <p className="text-2xl font-black text-slate-900 tracking-tighter" style={{ fontFamily: 'Gabarito, sans-serif' }}>
              {stat.val}
            </p>
            <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase flex items-center gap-1">
              <span className="text-[#E84922]">•</span> {stat.trend}
            </p>
          </div>
        ))}
      </div>

      {/* Main Insights section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-8">
        {/* Financial Execution Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Gabarito, sans-serif' }}>
                Ejecución Mensual
              </h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Inversión aprobada por mes (COP)</p>
            </div>
            <div className="flex gap-2">
              <div className="px-3 py-1 bg-slate-50 rounded-lg text-[10px] font-bold text-slate-500">6 Meses</div>
            </div>
          </div>

          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics?.chart || []}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis
                  hide
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '16px',
                    border: 'none',
                    boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)',
                    fontSize: '12px',
                    fontWeight: '800',
                    fontFamily: 'Gabarito'
                  }}
                  formatter={(val: number) => [formatter.format(val), 'Valor']}
                />
                <Area
                  type="monotone"
                  dataKey="valor"
                  stroke="#10B981"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorVal)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity Wall */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col">
          <h2 className="text-xl font-black text-slate-900 mb-6 tracking-tight" style={{ fontFamily: 'Gabarito, sans-serif' }}>
            Actividad Reciente
          </h2>
          <div className="space-y-6 flex-1 overflow-y-auto pr-2">
            {(metrics?.activity || []).map((item: any, i: number) => (
              <div key={i} className="flex gap-4 group cursor-pointer">
                <div className="relative">
                  <div className={`w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-all ${i === 0 ? 'bg-emerald-50 text-emerald-500 ring-2 ring-emerald-100' : ''}`}>
                    <AlertCircle size={18} />
                  </div>
                  {i < (metrics?.activity.length - 1) && (
                    <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[1px] h-6 bg-slate-100"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <p className="text-xs font-black text-slate-800 truncate mr-2">{item.project}</p>
                    <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap uppercase tracking-tighter">{item.date}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium truncate">
                    Por <span className="font-bold text-slate-700">{item.user}</span> •
                    <span className={`ml-1 font-black ${['aprobado', 'finalizado', 'aprobado_financiera', 'aprobado_comite'].includes(item.status) ? 'text-emerald-500' :
                        item.status.includes('rechazado') ? 'text-rose-500' : 'text-amber-500'
                      } uppercase tracking-widest text-[8px]`}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </p>
                </div>
              </div>
            ))}

            {(!metrics?.activity || metrics.activity.length === 0) && (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <Clock size={40} className="text-slate-100 mb-2" />
                <p className="text-xs text-slate-400 font-medium italic">Sin actividad reciente para mostrar todavía.</p>
              </div>
            )}
          </div>
          <button className="mt-8 w-full py-3 bg-slate-50 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors">
            Ver Auditoría Completa
          </button>
        </div>
      </div>
    </div>
  );
}
