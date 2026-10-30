"use client";

import { useState } from "react";
import { Plus, Trash2, Target, CheckCircle2, PauseCircle, PlayCircle, Pencil, Trophy } from "lucide-react";
import type { Goal } from "@/db/schema";
import { create, list, remove, update, useLoad } from "@/lib/api";
import { daysBetween, fa, formatJalali, pct, todayISO } from "@/lib/jalali";
import { Button, Card, Empty, Field, Input, Modal, PageHeader, ProgressBar, Ring, Select, StatCard, Textarea, cn, Loading } from "@/components/ui";

const AREAS: Record<string, { color: string; icon: string }> = {
  "کار": { color: "#0ea5e9", icon: "💼" },
  "تحصیل": { color: "#8b5cf6", icon: "🎓" },
  "مالی": { color: "#16a34a", icon: "💰" },
  "سلامت": { color: "#ef4444", icon: "❤️" },
  "شخصی": { color: "#f59e0b", icon: "🌱" },
};

export default function GoalsPage() {
  const today = todayISO();
  const { data: goals, loading, reload } = useLoad(() => list<Goal>("goals"), []);
  const [draft, setDraft] = useState<Partial<Goal> | null>(null);
  const [saving, setSaving] = useState(false);
  const [areaFilter, setAreaFilter] = useState<string>("همه");

  const all = goals ?? [];
  const active = all.filter((g) => g.status === "active");
  const done = all.filter((g) => g.status === "done");
  const avg = active.length ? Math.round(active.reduce((a, g) => a + pct(g.currentValue, g.targetValue), 0) / active.length) : 0;
  const overdue = active.filter((g) => g.deadline && g.deadline < today);
  const visible = all.filter((g) => areaFilter === "همه" || g.area === areaFilter).sort((a, b) => (a.status === b.status ? 0 : a.status === "active" ? -1 : 1));

  async function save() {
    if (!draft?.title) return alert("عنوان هدف را وارد کنید");
    setSaving(true);
    const payload = {
      title: draft.title,
      area: draft.area ?? "شخصی",
      targetValue: Number(draft.targetValue ?? 100),
      currentValue: Number(draft.currentValue ?? 0),
      unit: draft.unit || "درصد",
      deadline: draft.deadline || null,
      status: draft.status ?? "active",
      notes: draft.notes || null,
    };
    if (draft.id) await update("goals", draft.id, payload);
    else await create("goals", payload);
    setSaving(false);
    setDraft(null);
    reload(true);
  }
  async function progress(g: Goal) {
    const v = prompt(`مقدار فعلی «${g.title}» (${g.unit}):`, String(g.currentValue));
    if (v === null) return;
    const currentValue = Number(v);
    await update("goals", g.id, { currentValue, status: currentValue >= g.targetValue ? "done" : g.status === "done" ? "active" : g.status });
    reload(true);
  }
  async function setStatus(g: Goal, status: string) {
    await update("goals", g.id, { status });
    reload(true);
  }

  return (
    <div className="fade-up">
      <PageHeader
        title="اهداف و برنامه‌ریزی"
        subtitle="اهداف بلندمدت را تعریف کن، به اعداد قابل اندازه‌گیری تبدیل کن و پیشرفت را دنبال کن"
        actions={
          <Button onClick={() => setDraft({ area: "شخصی", targetValue: 100, currentValue: 0, unit: "درصد", status: "active" })}>
            <Plus size={16} /> هدف جدید
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="flex items-center gap-4 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
          <Ring value={avg} size={64} stroke={7} />
          <div>
            <div className="text-xs text-slate-500">میانگین پیشرفت</div>
            <div className="text-lg font-extrabold text-emerald-950">{fa(active.length)} هدف فعال</div>
          </div>
        </div>
        <StatCard label="اهداف محقق‌شده" value={fa(done.length)} sub={`از ${fa(all.length)} هدف`} icon={<Trophy size={22} />} tone="amber" />
        <StatCard label="سررسید گذشته" value={fa(overdue.length)} sub="نیاز به بازنگری" icon={<Target size={22} />} tone={overdue.length ? "rose" : "green"} />
        <StatCard label="نزدیک‌ترین سررسید" value={active.filter((g) => g.deadline && g.deadline >= today).sort((a, b) => a.deadline!.localeCompare(b.deadline!))[0]?.deadline ? `${fa(daysBetween(today, active.filter((g) => g.deadline && g.deadline >= today).sort((a, b) => a.deadline!.localeCompare(b.deadline!))[0].deadline!))} روز` : "—"} sub="تا مهلت بعدی" icon={<CheckCircle2 size={22} />} tone="blue" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {["همه", ...Object.keys(AREAS)].map((a) => (
          <button key={a} onClick={() => setAreaFilter(a)} className={cn("rounded-full px-3 py-1 text-xs font-semibold", areaFilter === a ? "bg-emerald-700 text-white" : "border border-emerald-100 bg-white text-slate-600")}>
            {a !== "همه" && AREAS[a].icon} {a}
          </button>
        ))}
      </div>

      {loading && !goals ? (
        <Loading />
      ) : visible.length === 0 ? (
        <Empty text="هنوز هدفی تعریف نشده. اولین هدفت را بنویس!" action={<Button onClick={() => setDraft({ area: "شخصی", targetValue: 100, currentValue: 0, unit: "درصد", status: "active" })}>تعریف هدف</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((g) => {
            const p = pct(g.currentValue, g.targetValue);
            const area = AREAS[g.area] ?? AREAS["شخصی"];
            const left = g.deadline ? daysBetween(today, g.deadline) : null;
            return (
              <Card key={g.id} className={cn(g.status !== "active" && "opacity-75")}>
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl" style={{ background: area.color + "22" }}>
                    {area.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={cn("truncate font-bold", g.status === "done" && "line-through")}>{g.title}</h3>
                      {g.status === "done" && <CheckCircle2 size={16} className="text-emerald-600" />}
                      {g.status === "paused" && <PauseCircle size={16} className="text-amber-500" />}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {g.area}
                      {g.deadline && ` • مهلت ${formatJalali(g.deadline, "dayMonth")}`}
                      {left !== null && g.status === "active" && (
                        <span className={cn("mr-1 font-semibold", left < 0 ? "text-rose-600" : left <= 7 ? "text-amber-600" : "text-slate-500")}>
                          ({left < 0 ? `${fa(-left)} روز گذشته` : `${fa(left)} روز مانده`})
                        </span>
                      )}
                    </div>
                  </div>
                  <Ring value={p} size={52} stroke={6} color={area.color} />
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs text-slate-600">
                    <span>
                      {fa(g.currentValue)} از {fa(g.targetValue)} {g.unit}
                    </span>
                    <span className="font-bold" style={{ color: area.color }}>
                      {fa(p)}٪
                    </span>
                  </div>
                  <ProgressBar value={p} color={area.color} />
                </div>
                {g.notes && <p className="mt-2 text-xs text-slate-500">{g.notes}</p>}
                <div className="mt-3 flex items-center gap-1 border-t border-slate-100 pt-3">
                  <Button size="sm" variant="soft" onClick={() => progress(g)}>
                    به‌روزرسانی پیشرفت
                  </Button>
                  {g.status === "active" ? (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(g, "paused")} title="توقف">
                      <PauseCircle size={14} />
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(g, "active")} title="ادامه">
                      <PlayCircle size={14} />
                    </Button>
                  )}
                  {g.status !== "done" && (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(g, "done")} title="تکمیل">
                      <CheckCircle2 size={14} />
                    </Button>
                  )}
                  <span className="flex-1" />
                  <Button size="sm" variant="ghost" onClick={() => setDraft(g)}>
                    <Pencil size={14} />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-rose-500" onClick={async () => { if (confirm("هدف حذف شود؟")) { await remove("goals", g.id); reload(true); } }}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? "ویرایش هدف" : "هدف جدید"} footer={<>
        <Button variant="ghost" onClick={() => setDraft(null)}>انصراف</Button>
        <Button onClick={save} loading={saving}>ذخیره</Button>
      </>}>
        {draft && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="عنوان هدف" className="col-span-2"><Input autoFocus value={draft.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="مثلاً: خواندن ۱۲ کتاب در سال" /></Field>
            <Field label="حوزه">
              <Select value={draft.area ?? "شخصی"} onChange={(e) => setDraft({ ...draft, area: e.target.value })}>
                {Object.keys(AREAS).map((a) => <option key={a}>{a}</option>)}
              </Select>
            </Field>
            <Field label="وضعیت">
              <Select value={draft.status ?? "active"} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                <option value="active">فعال</option>
                <option value="paused">متوقف</option>
                <option value="done">محقق‌شده</option>
              </Select>
            </Field>
            <Field label="مقدار هدف"><Input type="number" min={0} value={draft.targetValue ?? 100} onChange={(e) => setDraft({ ...draft, targetValue: Number(e.target.value) })} /></Field>
            <Field label="مقدار فعلی"><Input type="number" min={0} value={draft.currentValue ?? 0} onChange={(e) => setDraft({ ...draft, currentValue: Number(e.target.value) })} /></Field>
            <Field label="واحد"><Input value={draft.unit ?? "درصد"} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} placeholder="کتاب، کیلومتر، درصد…" /></Field>
            <Field label="مهلت"><Input type="date" value={draft.deadline ?? ""} onChange={(e) => setDraft({ ...draft, deadline: e.target.value })} /></Field>
            <Field label="یادداشت / چرایی هدف" className="col-span-2"><Textarea value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} className="min-h-[60px]" /></Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
