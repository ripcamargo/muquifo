import { useEffect, useRef, useState } from 'react';
import { EXAMPLE_SETTINGS } from '../../../config/availabilityDefaults';
import { saveSettings, subscribeSettings } from '../../../services/availability';
import { friendlyError } from '../../../services/firebase/errors';
import type { AvailabilitySettings } from '../../../types';
import { validateIntervals } from '../../../utils/slots';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { useToast } from '../../ui/Toast';
import { LoadingCards } from '../DashboardPage';
import { DatesEditor } from './DatesEditor';
import { RulesEditor } from './RulesEditor';
import { WeeklyEditor } from './WeeklyEditor';

type Tab = 'semana' | 'datas' | 'regras';

const TABS: { id: Tab; label: string }[] = [
  { id: 'semana', label: 'Semana' },
  { id: 'datas', label: 'Datas e bloqueios' },
  { id: 'regras', label: 'Regras de horário' },
];

function validateSettings(s: AvailabilitySettings): string | null {
  for (let d = 0; d < 7; d++) {
    const err = validateIntervals(s.weekly[String(d)] ?? []);
    if (err) return err;
  }
  for (const svc of Object.values(s.services)) {
    if (svc.minDurationMin < 15) return 'A duração mínima precisa ser de pelo menos 15 minutos.';
    if (svc.maxDurationMin < svc.minDurationMin) return 'A duração máxima não pode ser menor que a mínima.';
    if (svc.stepMin < 15) return 'O passo dos horários precisa ser de pelo menos 15 minutos.';
  }
  if (s.maxDaysAhead < 1 || s.maxDaysAhead > 365) return 'A janela de agendamento deve ficar entre 1 e 365 dias.';
  return null;
}

export function AvailabilityPage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('semana');
  const [remote, setRemote] = useState<AvailabilitySettings | null | undefined>(undefined);
  const [form, setForm] = useState<AvailabilitySettings | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const lastRemote = useRef<string>('');
  useEffect(
    () =>
      subscribeSettings((s) => {
        setRemote(s);
        // Só substitui o formulário se não houver edição local pendente.
        setForm((current) =>
          current === null || JSON.stringify(current) === lastRemote.current ? s ?? structuredClone(EXAMPLE_SETTINGS) : current,
        );
        lastRemote.current = JSON.stringify(s);
      }, setLoadError),
    [],
  );

  if (loadError) {
    return <Alert tone="error" title="Não foi possível carregar a disponibilidade">{friendlyError(loadError)}</Alert>;
  }
  if (remote === undefined || !form) return <LoadingCards />;

  const published = remote !== null;
  const dirty = JSON.stringify(form) !== JSON.stringify(remote);
  const validation = validateSettings(form);

  async function save() {
    if (!form || validation) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveSettings(form);
      toast(published ? 'Disponibilidade atualizada.' : 'Agenda publicada! Os horários já aparecem no site.');
    } catch (err) {
      setSaveError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="adm-page-title">
        <div>
          <h1 className="mq-display">Disponibilidade</h1>
          <p>Defina quando o estúdio atende. O site mostra só o que estiver livre.</p>
        </div>
      </div>

      {!published && (
        <Alert tone="warning" title="A agenda ainda não está publicada" className="mb-4">
          O site mostra “agenda ainda não aberta” até você salvar. Os valores abaixo são só um exemplo — revise a
          semana e as regras e toque em “Publicar agenda”.
        </Alert>
      )}

      <div className="adm-tabs" role="tablist" aria-label="Configurações de disponibilidade">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'semana' && <WeeklyEditor settings={form} onChange={setForm} />}
        {tab === 'regras' && <RulesEditor settings={form} onChange={setForm} />}
        {tab === 'datas' &&
          (published ? (
            <DatesEditor settings={remote} />
          ) : (
            <Alert tone="info">Publique a semana primeiro; depois você ajusta datas específicas aqui.</Alert>
          ))}
      </div>

      {tab !== 'datas' && (
        <div className="adm-savebar">
          {saveError ? <span role="alert">{saveError}</span> : validation ? <span role="alert">{validation}</span> : dirty ? <span>Alterações não salvas</span> : null}
          {dirty && published && (
            <Button variant="ghost" onClick={() => setForm(structuredClone(remote))} disabled={saving}>
              Descartar
            </Button>
          )}
          <Button variant="primary" onClick={save} loading={saving} disabled={!!validation || (!dirty && published)}>
            {published ? 'Salvar alterações' : 'Publicar agenda'}
          </Button>
        </div>
      )}
    </>
  );
}
