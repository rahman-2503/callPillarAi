import { Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input, Label } from '@/components/ui/input';
import { api, ApiError } from '@/lib/api';

export function NewCallDialog({ trigger }: { trigger?: React.ReactNode }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', prospectName: '', company: '', prospectRole: '' });

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const title =
      form.title.trim() ||
      [form.prospectName.trim(), form.company.trim()].filter(Boolean).join(', ') ||
      'Untitled call';
    setSaving(true);
    try {
      const response = await api.createCall({
        title,
        prospectName: form.prospectName.trim() || undefined,
        company: form.company.trim() || undefined,
        prospectRole: form.prospectRole.trim() || undefined,
      });
      setOpen(false);
      setForm({ title: '', prospectName: '', company: '', prospectRole: '' });
      navigate(`/calls/${response.data.id}/live`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The call could not be created. Please retry.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="lg">
            <Plus className="size-4" />
            Start a new call
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a new call</DialogTitle>
          <DialogDescription>
            Name the call so you can find it later. The prospect details are optional, but they make the
            first ten seconds easier.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="prospectName">Prospect name</Label>
              <Input
                id="prospectName"
                value={form.prospectName}
                onChange={(event) => update('prospectName', event.target.value)}
                placeholder="e.g. Senthil"
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prospectRole">Role</Label>
              <Input
                id="prospectRole"
                value={form.prospectRole}
                onChange={(event) => update('prospectRole', event.target.value)}
                placeholder="e.g. Director"
                maxLength={120}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={form.company}
              onChange={(event) => update('company', event.target.value)}
              placeholder="e.g. Kalyx Enterprises"
              maxLength={160}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="title">Call title (optional)</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(event) => update('title', event.target.value)}
              placeholder="Built automatically from the name and company"
              maxLength={120}
            />
          </div>
          {error ? (
            <p role="alert" className="rounded-lg border border-signal/20 bg-signal/5 px-3 py-2 text-xs text-signal">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {saving ? 'Creating…' : 'Start call'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
