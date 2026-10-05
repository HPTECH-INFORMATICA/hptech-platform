"use client";

import { useEffect, useState } from "react";

import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DatePicker from "@/components/ui/DatePicker";
import Dialog, { DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import useToast from "@/hooks/useToast";
import { createPatientPlanContract, listPatientPlanContracts, type PatientPlanContractData } from "@/services/patient-plan-contract-service";
import { listTreatmentPlans, type TreatmentPlanData } from "@/services/treatment-plan-service";
import type { PatientData } from "@/services/patient-service";

type Props = { patient: PatientData | null; canContract: boolean; onClose: () => void };
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const money = (value: string) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const date = (value: string) => value.split("-").reverse().join("/");

export default function PatientPlansDialog({ patient, canContract, onClose }: Props) {
  const { toast } = useToast();
  const [contracts, setContracts] = useState<PatientPlanContractData[] | null>(null);
  const [plans, setPlans] = useState<TreatmentPlanData[]>([]);
  const [loading, setLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [planId, setPlanId] = useState("");
  const [startsOn, setStartsOn] = useState<string | null>(today());
  const [dueDate, setDueDate] = useState<string | null>(today());
  const [paymentState, setPaymentState] = useState("PENDING");
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!patient) return;
    let active = true;
    Promise.all([listPatientPlanContracts(patient.id), listTreatmentPlans()])
      .then(([contractResult, planResult]) => { if (active) { setContracts(contractResult.items); setPlans(planResult.items.filter((item) => item.is_active)); setError(null); } })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Não foi possível carregar os planos do paciente."); })
    return () => { active = false; };
  }, [patient, reload]);

  function openContract() {
    const current = today();
    setPlanId(""); setStartsOn(current); setDueDate(current); setPaymentState("PENDING"); setPaymentMethod("PIX"); setError(null); setEditorOpen(true);
  }

  async function save() {
    if (!patient || !planId || !startsOn || !dueDate || (paymentState === "PAID" && !paymentMethod.trim())) { setError("Informe o plano, as datas e a condição de pagamento."); return; }
    setLoading(true); setError(null);
    try {
      await createPatientPlanContract({ patient_id: patient.id, treatment_plan_id: planId, starts_on: startsOn, payment_due_date: dueDate, paid_date: paymentState === "PAID" ? today() : null, payment_method: paymentState === "PAID" ? paymentMethod.trim() : null });
      toast({ variant: "success", description: "Plano contratado e saldo inicial gerado." });
      setEditorOpen(false); setContracts(null); setReload((value) => value + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível contratar o plano."); }
    finally { setLoading(false); }
  }

  return <>
    <Dialog open={patient !== null} onOpenChange={(open) => !open && onClose()}><DialogContent><DialogHeader><DialogTitle>Planos de {patient?.name}</DialogTitle><DialogDescription>Contratações, pagamento e saldo inicial de sessões.</DialogDescription></DialogHeader>
      <div className="space-y-4">{canContract ? <div className="flex justify-end"><Button onClick={openContract}>Contratar plano</Button></div> : null}{error && !editorOpen ? <Alert variant="danger" description={error} /> : null}
        {contracts?.length === 0 ? <EmptyState title="Nenhum plano contratado" description="Este paciente ainda não possui contrato de plano." /> : null}
        <div className="grid gap-3">{(contracts ?? []).map((contract) => <Card key={contract.id} variant="outlined" padding="sm"><div className="space-y-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold">{contract.plan_name_snapshot}</h3><p className="text-sm text-hp-muted">{money(contract.price_snapshot)} · válido até {date(contract.expires_on)}</p></div><Badge variant={contract.financial_status === "PAID" ? "success" : "warning"}>{contract.financial_status === "PAID" ? "Pago" : contract.financial_status === "PENDING" ? "Em aberto" : "Sem cobrança"}</Badge></div>{contract.items.map((item) => <div key={item.id} className="rounded-[var(--radius-md)] bg-hp-surface-subtle p-3 text-sm"><p className="font-medium">{item.service_name_snapshot}</p><p className="text-hp-muted">Saldo: {item.paid_available} pagas + {item.complimentary_available} cortesias</p></div>)}</div></Card>)}</div>
      </div><DialogFooter><DialogClose className="inline-flex min-h-11 items-center px-4">Fechar</DialogClose></DialogFooter></DialogContent></Dialog>
    <Dialog open={editorOpen} onOpenChange={setEditorOpen}><DialogContent><DialogHeader><DialogTitle>Contratar plano</DialogTitle><DialogDescription>A contratação gera o saldo inicial e um único recebível.</DialogDescription></DialogHeader><div className="space-y-4"><Select label="Plano" required value={planId} onChange={(event) => setPlanId(event.target.value)} options={[{ value: "", label: "Selecione" }, ...plans.map((plan) => ({ value: plan.id, label: `${plan.name} — ${money(plan.price)}` }))]} /><div className="grid gap-4 sm:grid-cols-2"><DatePicker mode="single" label="Início" required value={startsOn} onValueChange={setStartsOn} /><DatePicker mode="single" label="Vencimento" required value={dueDate} onValueChange={setDueDate} /></div><Select label="Pagamento" value={paymentState} onChange={(event) => setPaymentState(event.target.value)} options={[{ value: "PENDING", label: "Em aberto" }, { value: "PAID", label: "Pago integralmente" }]} />{paymentState === "PAID" ? <Input label="Forma de pagamento" required value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} /> : null}{error ? <Alert variant="danger" description={error} /> : null}</div><DialogFooter><DialogClose className="inline-flex min-h-11 items-center px-4">Cancelar</DialogClose><Button loading={loading} onClick={() => void save()}>Confirmar contratação</Button></DialogFooter></DialogContent></Dialog>
  </>;
}
