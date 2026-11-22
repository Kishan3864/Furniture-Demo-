'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { Button, Input } from './ui';

/**
 * Chip-style editor for a list of strings: add, remove, reorder.
 * Controlled - parent owns `items`.
 */
export function ListEditor({
  items,
  onChange,
  placeholder,
  maxLength = 40,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  const t = useT();
  const [val, setVal] = useState('');
  const [err, setErr] = useState('');

  const add = () => {
    const v = val.trim().replace(/\s+/g, ' ');
    if (!v) return setErr(t('Type something first'));
    if (items.some((x) => x.toLowerCase() === v.toLowerCase())) return setErr(t('This is already in the list'));
    onChange([...items, v]);
    setVal('');
    setErr('');
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {items.map((it, i) => (
          <span
            key={it + i}
            className="inline-flex items-center gap-0.5 rounded-full border border-wood-200 bg-wood-50 py-1 pl-1 pr-1 text-sm text-wood-900"
          >
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              className="rounded-full p-0.5 text-wood-500 hover:bg-wood-100 disabled:opacity-30"
              aria-label={t('Move left')}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="px-1">{it}</span>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === items.length - 1}
              className="rounded-full p-0.5 text-wood-500 hover:bg-wood-100 disabled:opacity-30"
              aria-label={t('Move right')}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, k) => k !== i))}
              className="ml-0.5 rounded-full p-0.5 text-wood-500 hover:bg-red-100 hover:text-red-600"
              aria-label={t('Remove {name}', { name: it })}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        {!items.length && <span className="text-sm text-wood-500">{t('The list is empty')}</span>}
      </div>
      <div className="flex gap-2">
        <Input
          value={val}
          maxLength={maxLength}
          onChange={(e) => {
            setVal(e.target.value);
            if (err) setErr('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder ?? t('Type a new name...')}
          invalid={!!err}
        />
        <Button variant="secondary" onClick={add} icon={<Plus className="h-4 w-4" />}>
          {t('Add')}
        </Button>
      </div>
      {err && <p className="-mt-1 text-xs text-red-600">{err}</p>}
    </div>
  );
}
