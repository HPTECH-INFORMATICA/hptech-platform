"use client";

import { useEffect, useState } from "react";
import { hasPermission, type CurrentUser } from "@/auth/types";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Dialog, { DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/DropdownMenu";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import RowActionsMenu from "@/components/ui/RowActionsMenu";
import Select from "@/components/ui/Select";
import Table, { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import Textarea from "@/components/ui/Textarea";
import useToast from "@/hooks/useToast";
import { listServices, type ServiceData } from "@/services/service-service";
import { createTreatmentPlan, deleteTreatmentPlan, listTreatmentPlans, updateTreatmentPlan, updateTreatmentPlanStatus, type TreatmentPlanData, type TreatmentPlanInput } from "@/services/treatment-plan-service";

type DraftItem = { serviceId: string; paid: string; courtesy: string };
const newItem = (): DraftItem => ({ serviceId: "", paid: "", courtesy: "0" });

export default function PlansPanel({ currentUser }: { currentUser: CurrentUser }) {
  const { toast } = useToast();
  const [plans, setPlans] = useState<TreatmentPlanData[]>([]);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [reload, setReload] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TreatmentPlanData | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [validity, setValidity] = useState("");
  const [items, setItems] = useState<DraftItem[]>([newItem()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TreatmentPlanData | null>(null);
  const canCreate = hasPermission(currentUser, "SERVICES", "CREATE");
  const canUpdate = hasPermission(currentUser, "SERVICES", "UPDATE");
  const canDelete = hasPermission(currentUser, "SERVICES", "DELETE");
  const hasActions = canUpdate || canDelete;

  useEffect(() => {
    let active = true;
    Promise.all([listTreatmentPlans(), listServices(new URLSearchParams({ page: "1", page_size: "100", is_active: "true" }))])
      .then(([planResult, serviceResult]) => { if (active) { setPlans(planResult.items); setServices(serviceResult.items); setError(null); } })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Não foi possível carregar os planos."); });
    return () => { active = false; };
  }, [reload]);

  function reset() { setEditing(null); setName(""); setDescription(""); setPrice(""); setValidity(""); setItems([newItem()]); setError(null); }
  function openCreate() { reset(); setOpen(true); }
  function openEdit(plan: TreatmentPlanData) {
    setEditing(plan);
    setName(plan.name);
    setDescription(plan.description ?? "");
    setPrice(String(plan.price).replace(".", ","));
    setValidity(String(plan.validity_days));
    setItems(plan.items.map((item) => ({ serviceId: item.service_id, paid: String(item.paid_sessions), courtesy: String(item.complimentary_sessions) })));
    setError(null);
    setOpen(true);
  }
  function updateItem(index: number, field: keyof DraftItem, value: string) { setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item)); }

  async function save() {
    if (!name.trim() || !/^\d+(?:[.,]\d{1,2})?$/.test(price) || !/^\d+$/.test(validity) || Number(validity) < 1 || items.some((item) => !item.serviceId || !/^\d+$/.test(item.paid) || Number(item.paid) < 1 || !/^\d+$/.test(item.courtesy))) { setError("Revise nome, preço, validade, serviços e quantidades."); return; }
    if (new Set(items.map((item) => item.serviceId)).size !== items.length) { setError("O mesmo serviço não pode ser repetido."); return; }
    setSaving(true); setError(null);
    try {
      const payload: TreatmentPlanInput = { name: name.trim(), description: description.trim() || null, price: price.replace(",", "."), validity_days: Number(validity), items: items.map((item) => ({ service_id: item.serviceId, paid_sessions: Number(item.paid), complimentary_sessions: Number(item.courtesy) })) };
      if (editing) await updateTreatmentPlan(editing.id, payload);
      else await createTreatmentPlan(payload);
      toast({ variant: "success", description: editing ? "Plano atualizado." : "Plano cadastrado." }); setOpen(false); reset(); setReload((value) => value + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível salvar o plano."); }
    finally { setSaving(false); }
  }

  async function toggle(plan: TreatmentPlanData) { try { await updateTreatmentPlanStatus(plan.id, !plan.is_active); setReload((value) => value + 1); } catch (reason) { toast({ variant: "danger", description: reason instanceof Error ? reason.message : "Não foi possível alterar o plano." }); } }
  async function remove() { if (!deleteTarget) return; setSaving(true); try { await deleteTreatmentPlan(deleteTarget.id); setDeleteTarget(null); setReload((value) => value + 1); toast({ variant: "success", description: "Plano removido." }); } catch (reason) { toast({ variant: "danger", description: reason instanceof Error ? reason.message : "Não foi possível remover o plano." }); } finally { setSaving(false); } }

  return <div className="space-y-6">
    <div className="flex justify-end">{canCreate ? <Button disabled={services.length === 0} onClick={openCreate}>Novo plano</Button> : null}</div>
    {error && !open ? <Alert variant="danger" description={error} /> : null}
    {plans.length === 0 ? <EmptyState title="Nenhum plano cadastrado" description="Crie pacotes com sessões pagas, cortesias, validade e preço próprio." /> : <Table><TableHeader><TableRow><TableHead>Plano</TableHead><TableHead>Sessões</TableHead><TableHead>Validade</TableHead><TableHead>Preço</TableHead><TableHead>Status</TableHead>{hasActions ? <TableHead className="w-16"><span className="sr-only">Ações</span></TableHead> : null}</TableRow></TableHeader><TableBody>{plans.map((plan) => <TableRow key={plan.id}><TableCell><span className="font-semibold">{plan.name}</span></TableCell><TableCell>{plan.items.map((item) => <span key={item.id} className="block text-sm">{item.service_name}: {item.paid_sessions} + {item.complimentary_sessions} cortesias</span>)}</TableCell><TableCell>{plan.validity_days} dias</TableCell><TableCell>R$ {Number(plan.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell><TableCell><Badge variant={plan.is_active ? "success" : "neutral"}>{plan.is_active ? "Ativo" : "Inativo"}</Badge></TableCell>{hasActions ? <TableCell className="text-right"><RowActionsMenu label={`Ações de ${plan.name}`}>{canUpdate ? <DropdownMenuItem onSelect={() => openEdit(plan)}>Editar plano</DropdownMenuItem> : null}{canUpdate ? <DropdownMenuItem onSelect={() => void toggle(plan)}>{plan.is_active ? "Desativar" : "Reativar"}</DropdownMenuItem> : null}{canDelete && canUpdate ? <DropdownMenuSeparator /> : null}{canDelete ? <DropdownMenuItem variant="danger" onSelect={() => setDeleteTarget(plan)}>Remover plano</DropdownMenuItem> : null}</RowActionsMenu></TableCell> : null}</TableRow>)}</TableBody></Table>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>{editing ? "Editar plano" : "Novo plano"}</DialogTitle><DialogDescription>{editing ? "Atualize os dados comerciais e as sessões do plano." : "Defina preço, validade, sessões contratadas e cortesias."}</DialogDescription></DialogHeader><div className="space-y-4"><Input label="Nome" required value={name} onChange={(event) => setName(event.target.value)} /><Textarea label="Descrição" value={description} onChange={(event) => setDescription(event.target.value)} /><div className="grid gap-4 sm:grid-cols-2"><Input label="Preço" required inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} /><Input label="Validade em dias" required inputMode="numeric" value={validity} onChange={(event) => setValidity(event.target.value)} /></div><div className="space-y-3"><div className="flex justify-between"><h3 className="font-semibold">Serviços e sessões</h3><Button size="sm" variant="outline" onClick={() => setItems((current) => [...current, newItem()])}>Adicionar</Button></div>{items.map((item, index) => <div key={index} className="grid gap-3 rounded-[var(--radius-md)] border border-hp-border p-3 sm:grid-cols-[1fr_7rem_7rem_auto]"><Select label="Serviço" value={item.serviceId} onChange={(event) => updateItem(index, "serviceId", event.target.value)} options={[{ value: "", label: "Selecione" }, ...services.map((service) => ({ value: service.id, label: service.name }))]} /><Input label="Pagas" value={item.paid} onChange={(event) => updateItem(index, "paid", event.target.value)} /><Input label="Cortesias" value={item.courtesy} onChange={(event) => updateItem(index, "courtesy", event.target.value)} /><Button className="self-end" size="sm" variant="ghost" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remover</Button></div>)}</div>{error ? <Alert variant="danger" description={error} /> : null}</div><DialogFooter><DialogClose className="inline-flex min-h-11 items-center px-4">Cancelar</DialogClose><Button loading={saving} onClick={() => void save()}>{editing ? "Salvar alterações" : "Salvar"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={deleteTarget !== null} onOpenChange={(value) => !value && setDeleteTarget(null)}><DialogContent><DialogHeader><DialogTitle>Remover plano</DialogTitle><DialogDescription>O plano deixará o catálogo operacional.</DialogDescription></DialogHeader><DialogFooter><DialogClose className="inline-flex min-h-11 items-center px-4">Cancelar</DialogClose><Button variant="danger" loading={saving} onClick={() => void remove()}>Remover plano</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
