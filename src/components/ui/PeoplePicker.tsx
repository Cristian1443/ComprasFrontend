import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../../authConfig';
import { getCompanyUsersFromGroup } from '../../lib/graphService';
import { Search, X, Loader2, User } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GROUP_ID = (import.meta as any).env?.VITE_SUPERVISION_GROUP_ID as string;

interface ADUser {
  id: string;
  displayName: string;
  mail: string;
  jobTitle: string | null;
  userPrincipalName: string;
}

interface PeoplePickerProps {
  label: string;
  value: string;
  email: string;
  onChange: (displayName: string, email: string) => void;
  placeholder?: string;
  required?: boolean;
}

// Cache de miembros del grupo para no volver a pedirlos en cada instancia
let groupMembersCache: ADUser[] | null = null;
let groupMembersFetching: Promise<ADUser[]> | null = null;

export function PeoplePicker({ label, value, email, onChange, placeholder = 'Buscar persona...', required }: PeoplePickerProps) {
  const { instance, accounts } = useMsal();
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState<ADUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ADUser | null>(
    value ? { id: '', displayName: value, mail: email, jobTitle: null, userPrincipalName: email } : null
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sincronizar cuando el padre cambia value (auto-relleno al seleccionar contrato)
  useEffect(() => {
    if (value && value !== query) {
      setQuery(value);
      setSelected({ id: '', displayName: value, mail: email, jobTitle: null, userPrincipalName: email });
    } else if (!value) {
      setQuery('');
      setSelected(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, email]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getGroupMembers = useCallback(async (): Promise<ADUser[]> => {
    if (groupMembersCache) return groupMembersCache;
    if (groupMembersFetching) return groupMembersFetching;

    groupMembersFetching = (async () => {
      const account = accounts[0];
      const tokenRes = await instance.acquireTokenSilent({ ...loginRequest, account });
      const data = await getCompanyUsersFromGroup(tokenRes.accessToken, GROUP_ID);
      const members = (data.value || []) as ADUser[];
      groupMembersCache = members;
      groupMembersFetching = null;
      return members;
    })();

    return groupMembersFetching;
  }, [instance, accounts]);

  const buscar = useCallback(async (texto: string) => {
    if (texto.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const members = await getGroupMembers();
      const q = texto.toLowerCase();
      const filtered = members.filter(u =>
        u.displayName?.toLowerCase().includes(q) ||
        u.mail?.toLowerCase().includes(q) ||
        u.userPrincipalName?.toLowerCase().includes(q)
      ).slice(0, 8);
      setResults(filtered);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [getGroupMembers]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSelected(null);
    onChange('', '');
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscar(val), 200);
  };

  const handleSelect = (u: ADUser) => {
    setSelected(u);
    setQuery(u.displayName);
    setOpen(false);
    setResults([]);
    onChange(u.displayName, u.mail || u.userPrincipalName);
  };

  const handleClear = () => {
    setSelected(null);
    setQuery('');
    setOpen(false);
    setResults([]);
    onChange('', '');
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1" style={{ fontFamily: 'Gabarito, sans-serif' }}>
        <User size={11} className="inline mr-1" />{label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className={`flex items-center border rounded-lg px-3 py-2 gap-2 bg-white transition-all ${selected ? 'border-green-400 bg-green-50' : 'border-gray-300 focus-within:ring-2 focus-within:ring-blue-300'}`}>
        <Search size={14} className="text-gray-400 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => { if (query.length >= 2 && !selected) { setOpen(true); buscar(query); } }}
          placeholder={placeholder}
          className="flex-1 text-sm bg-transparent outline-none text-gray-800 placeholder-gray-400"
          style={{ fontFamily: 'Gabarito, sans-serif' }}
          autoComplete="off"
        />
        {loading && <Loader2 size={14} className="animate-spin text-gray-400 shrink-0" />}
        {selected && (
          <button type="button" onClick={handleClear} className="text-gray-400 hover:text-gray-600 shrink-0">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Email del seleccionado */}
      {selected && (
        <p className="text-[11px] text-green-700 mt-0.5 truncate" style={{ fontFamily: 'Gabarito, sans-serif' }}>
          {selected.mail || selected.userPrincipalName}{selected.jobTitle ? ` · ${selected.jobTitle}` : ''}
        </p>
      )}

      {/* Dropdown resultados */}
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden" style={{ fontFamily: 'Gabarito, sans-serif' }}>
          {results.map(u => (
            <button
              key={u.id}
              type="button"
              onClick={() => handleSelect(u)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold" style={{ backgroundColor: 'var(--brand-secondary)' }}>
                {u.displayName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{u.displayName}</p>
                <p className="text-xs text-gray-400 truncate">{u.mail || u.userPrincipalName}{u.jobTitle ? ` · ${u.jobTitle}` : ''}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && !loading && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl px-3 py-3 text-sm text-gray-400 text-center" style={{ fontFamily: 'Gabarito, sans-serif' }}>
          No se encontraron resultados en el grupo
        </div>
      )}
    </div>
  );
}
