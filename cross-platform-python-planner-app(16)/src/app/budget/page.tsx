"use client";

import { useState } from "react";
import { Plus, Trash2, TrendingUp, TrendingDown, PiggyBank, Wallet, Settings2, Target } from "lucide-react";
import type { Budget, FinancialGoal, Transaction } from "@/db/schema";
import { create, list, remove, update, useLoad } from "@/lib/api";
import { compactMoney, fa, formatJalali, formatMoney, jalaliMonthKey, monthKeyLabel, monthKeyToRange, pct, shiftMonthKey, todayISO, JALALI_MONTHS } from "@/lib/jalali";
import { Button, Card, Donut, Empty, Field, Input, Modal, PageHeader, ProgressBar, RangeNav, Select, StatCard, Textarea, cn, Loading, COLORS } from "@/components/ui";

const EXPENSE_CATS = ["خوراک", "حمل‌ونقل", "قبوض", "تفریح", "خرید", "سلامت", "آموزش", "مسکن", "سایر"];
const INCOME_CATS = ["حقوق", "پروژه آزاد", "سرمایه‌گذاری", "هدیه", "سایر"];

export default function BudgetPage() {
  const today = todayISO();
  const [monthKey, setMonthKey] = useState(jalaliMonthKey(today));
  const range = monthKeyToRange(monthKey);
  const histFrom = monthKeyToRange(shiftMonthKey(monthKey, -5)).from;
  const { data, loading, reload } = useLoad(
    async () => {
      const [tx, budgets, goals] = await Promise.all([list<Transaction>("transactions", { from: histFrom, to: range.to }), list<Budget>("budgets", { monthKey }), list<FinancialGoal>("financial_goals")]);
      return { tx, budgets, goals };
    },
    [monthKey],
  );

  const [txDraft, setTxDraft] = useState<Partial<Transaction> | null>(null);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetForm, setBudgetForm] = useState<Record<string, number>>({});
  const [goalDraft, setGoalDraft] = useState<Partial<FinancialGoal> | null>(null);
  const [saving, setSaving] = useState(false);

  const all = data?.tx ?? [];
  const tx = all.filter((t) => t.date >= range.from && t.date <= range.to);
  const income = tx.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
  const expense = tx.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);
  const balance = income - expense;
  const savingsRate = income ? Math.round((balance / income) * 100) : 0;
  const byCat = EXPENSE_CATS.map((c, i) => ({ label: c, value: tx.filter((t) => t.type === "expense" && t.category === c).reduce((a, t) => a + t.amount, 0), color: COLORS[i % COLORS.length] })).filter((c) => c.value > 0).sort((a, b) => b.value - a.value);
  const budgets = data?.budgets ?? [];
  const totalLimit = budgets.reduce((a, b) => a + b.limitAmount, 0);
  const months = Array.from({ length: 6 }, (_, i) => shiftMonthKey(monthKey, i - 5)).map((mk) => {
    const r = monthKeyToRange(mk);
    const m = all.filter((t) => t.date >= r.from && t.date <= r.to);
    return { mk, label: JALALI_MONTHS[r.jm - 1].slice(0, 3), income: m.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0), expense: m.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0) };
  });
  const maxMonth = Math.max(1, ...months.flatMap((m) => [m.income, m.expense]));

  async function saveTx() {
    if (!txDraft?.amount || !txDraft.category) return alert("مبلغ و دسته را وارد کنید");
    setSaving(true);
    const payload = { type: txDraft.type ?? "expense", amount: Number(txDraft.amount), category: txDraft.category, note: txDraft.note || null, date: txDraft.date ?? today };
    if (txDraft.id) await update("transactions", txDraft.id, payload);
    else await create("transactions", payload);
    setSaving(false);
    setTxDraft(null);
    reload(true);
  }
  async function saveBudgets() {
    setSaving(true);
    await Promise.all(Object.entries(budgetForm).filter(([, v]) => v > 0).map(([category, limitAmount]) => create("budgets", { category, limitAmount, monthKey })));
    setSaving(false);
    setBudgetOpen(false);
    reload(true);
  }
  async function saveGoal() {
    if (!goalDraft?.name || !goalDraft.targetAmount) return alert("نام و مبلغ هدف را وارد کنید");
    setSaving(true);
    const payload = { name: goalDraft.name, targetAmount: Number(goalDraft.targetAmount), savedAmount: Number(goalDraft.savedAmount ?? 0), deadline: goalDraft.deadline || null };
    if (goalDraft.id) await update("financial_goals", goalDraft.id, payload);
    else await create("financial_goals", payload);
    setSaving(false);
    setGoalDraft(null);
    reload(true);
  }
  async function addToGoal(g: FinancialGoal) {
    const v = prompt("چه مبلغی به این هدف اضافه شود؟ (تومان)", "1000000");
    if (!v) return;
    await update("financial_goals", g.id, { savedAmount: g.savedAmount + Number(v) });
    reload(true);
  }

  return (
    <div className="fade-up">
      <PageHeader
        title="ردیاب مالی"
        subtitle="مدیریت هوشمند درآمدها و هزینه‌ها، کنترل بودجه و رسیدن به اهداف مالی"
        actions={
          <>
            <RangeNav label={monthKeyLabel(monthKey)} onPrev={() => setMonthKey(shiftMonthKey(monthKey, -1))} onNext={() => setMonthKey(shiftMonthKey(monthKey, 1))} onToday={() => setMonthKey(jalaliMonthKey(today))} />
            <Button variant="outline" onClick={() => setTxDraft({ type: "income", date: today, category: "حقوق" })}>
              <TrendingUp size={16} /> درآمد
            </Button>
            <Button onClick={() => setTxDraft({ type: "expense", date: today, category: "خوراک" })}>
              <Plus size={16} /> هزینه
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="درآمد ماه" value={compactMoney(income)} sub={formatMoney(income)} icon={<TrendingUp size={22} />} />
        <StatCard label="هزینه ماه" value={compactMoney(expense)} sub={formatMoney(expense)} icon={<TrendingDown size={22} />} tone="rose" />
        <StatCard label="تراز" value={compactMoney(balance)} sub={balance >= 0 ? "پس‌انداز شده" : "کسری بودجه"} icon={<Wallet size={22} />} tone={balance >= 0 ? "green" : "rose"} />
        <StatCard label="نرخ پس‌انداز" value={`${fa(savingsRate)}٪`} sub="از درآمد ماه" icon={<PiggyBank size={22} />} tone="violet" />
      </div>

      {loading && !data ? (
        <Loading />
      ) : (
        <>
          <div className="mb-6 grid gap-6 lg:grid-cols-3">
            <Card title="هزینه‌ها بر اساس دسته">
              {byCat.length === 0 ? (
                <Empty text="هزینه‌ای در این ماه ثبت نشده" />
              ) : (
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <Donut data={byCat} size={150} stroke={24} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] text-slate-400">کل هزینه</span>
                      <span className="text-sm font-extrabold text-emerald-950">{compactMoney(expense)}</span>
                    </div>
                  </div>
                  <ul className="min-w-0 flex-1 space-y-1.5 text-xs">
                    {byCat.slice(0, 6).map((c) => (
                      <li key={c.label} className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                        <span className="flex-1 truncate">{c.label}</span>
                        <span className="font-semibold text-slate-600">{fa(Math.round((c.value / Math.max(1, expense)) * 100))}٪</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>

            <Card title="روند ۶ ماهه" subtitle="درآمد در برابر هزینه">
              <div className="flex h-[150px] items-end gap-2">
                {months.map((m) => (
                  <div key={m.mk} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`درآمد ${compactMoney(m.income)} • هزینه ${compactMoney(m.expense)}`}>
                    <div className="flex h-full w-full items-end justify-center gap-0.5">
                      <div className="w-2.5 rounded-t bg-emerald-500 sm:w-3" style={{ height: `${(m.income / maxMonth) * 100}%` }} />
                      <div className="w-2.5 rounded-t bg-rose-400 sm:w-3" style={{ height: `${(m.expense / maxMonth) * 100}%` }} />
                    </div>
                    <span className={cn("text-[10px]", m.mk === monthKey ? "font-bold text-emerald-800" : "text-slate-400")}>{m.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-4 text-[10px] text-slate-500">
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> درآمد</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-400" /> هزینه</span>
              </div>
            </Card>

            <Card
              title="بودجه دسته‌ها"
              subtitle={totalLimit ? `${compactMoney(expense)} از ${compactMoney(totalLimit)}` : "برای هر دسته سقف تعیین کنید"}
              action={
                <Button
                  size="sm"
                  variant="soft"
                  onClick={() => {
                    setBudgetForm(Object.fromEntries(EXPENSE_CATS.map((c) => [c, budgets.find((b) => b.category === c)?.limitAmount ?? 0])));
                    setBudgetOpen(true);
                  }}
                >
                  <Settings2 size={14} /> تنظیم
                </Button>
              }
            >
              {budgets.length === 0 ? (
                <Empty text="بودجه‌ای برای این ماه تعیین نشده" />
              ) : (
                <div className="space-y-3">
                  {budgets.map((b) => {
                    const spent = tx.filter((t) => t.type === "expense" && t.category === b.category).reduce((a, t) => a + t.amount, 0);
                    const p = pct(spent, b.limitAmount);
                    const over = spent > b.limitAmount;
                    return (
                      <div key={b.id} className="text-xs">
                        <div className="mb-1 flex justify-between">
                          <span className="font-semibold">{b.category}</span>
                          <span className={cn(over ? "font-bold text-rose-600" : "text-slate-500")}>
                            {compactMoney(spent)} / {compactMoney(b.limitAmount)}
                          </span>
                        </div>
                        <ProgressBar value={p} color={over ? "#e11d48" : p > 80 ? "#f59e0b" : "var(--accent)"} height={6} />
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card title="تراکنش‌های ماه" subtitle={`${fa(tx.length)} تراکنش`} className="lg:col-span-2">
              {tx.length === 0 ? (
                <Empty text="تراکنشی ثبت نشده" action={<Button size="sm" onClick={() => setTxDraft({ type: "expense", date: today, category: "خوراک" })}>ثبت هزینه</Button>} />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {tx.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 py-2.5 text-sm">
                      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", t.type === "income" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600")}>
                        {t.type === "income" ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      </span>
                      <button onClick={() => setTxDraft(t)} className="min-w-0 flex-1 text-right">
                        <div className="truncate font-semibold">
                          {t.category}
                          {t.note && <span className="font-normal text-slate-400"> — {t.note}</span>}
                        </div>
                        <div className="text-[11px] text-slate-400">{formatJalali(t.date, "weekday")}</div>
                      </button>
                      <span className={cn("whitespace-nowrap font-bold", t.type === "income" ? "text-emerald-700" : "text-rose-600")}>
                        {t.type === "income" ? "+" : "−"}
                        {formatMoney(t.amount)}
                      </span>
                      <button
                        onClick={async () => {
                          if (confirm("حذف شود؟")) {
                            await remove("transactions", t.id);
                            reload(true);
                          }
                        }}
                        className="rounded-lg p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="اهداف مالی" action={<Button size="sm" variant="soft" onClick={() => setGoalDraft({ savedAmount: 0 })}><Plus size={14} /> هدف</Button>}>
              {(data?.goals ?? []).length === 0 ? (
                <Empty text="هدف مالی تعریف نشده" />
              ) : (
                <div className="space-y-3">
                  {(data?.goals ?? []).map((g) => {
                    const p = pct(g.savedAmount, g.targetAmount);
                    return (
                      <div key={g.id} className="rounded-xl border border-slate-100 p-3">
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <button onClick={() => setGoalDraft(g)} className="flex items-center gap-1 font-semibold">
                            <Target size={14} className="text-emerald-600" /> {g.name}
                          </button>
                          <span className="font-bold text-emerald-800">{fa(p)}٪</span>
                        </div>
                        <ProgressBar value={p} color={p >= 100 ? "var(--accent)" : "var(--accent-mid)"} />
                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                          <span>
                            {compactMoney(g.savedAmount)} از {compactMoney(g.targetAmount)}
                            {g.deadline && ` • تا ${formatJalali(g.deadline, "dayMonth")}`}
                          </span>
                          <button onClick={() => addToGoal(g)} className="font-semibold text-emerald-700">
                            + واریز
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {/* Transaction modal */}
      <Modal
        open={!!txDraft}
        onClose={() => setTxDraft(null)}
        title={txDraft?.id ? "ویرایش تراکنش" : txDraft?.type === "income" ? "ثبت درآمد" : "ثبت هزینه"}
        footer={
          <>
            {txDraft?.id && (
              <Button variant="danger" className="ml-auto" onClick={async () => { if (confirm("حذف شود؟")) { await remove("transactions", txDraft.id!); setTxDraft(null); reload(true); } }}>
                <Trash2 size={14} /> حذف
              </Button>
            )}
            <Button variant="ghost" onClick={() => setTxDraft(null)}>انصراف</Button>
            <Button onClick={saveTx} loading={saving}>ذخیره</Button>
          </>
        }
      >
        {txDraft && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="نوع">
              <Select value={txDraft.type} onChange={(e) => setTxDraft({ ...txDraft, type: e.target.value, category: e.target.value === "income" ? INCOME_CATS[0] : EXPENSE_CATS[0] })}>
                <option value="expense">هزینه</option>
                <option value="income">درآمد</option>
              </Select>
            </Field>
            <Field label="دسته">
              <Select value={txDraft.category} onChange={(e) => setTxDraft({ ...txDraft, category: e.target.value })}>
                {(txDraft.type === "income" ? INCOME_CATS : EXPENSE_CATS).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="مبلغ (تومان)">
              <Input type="number" min={0} step={1000} value={txDraft.amount ?? ""} onChange={(e) => setTxDraft({ ...txDraft, amount: Number(e.target.value) })} />
            </Field>
            <Field label="تاریخ">
              <Input type="date" value={txDraft.date ?? today} onChange={(e) => setTxDraft({ ...txDraft, date: e.target.value })} />
            </Field>
            <Field label="یادداشت" className="col-span-2">
              <Textarea value={txDraft.note ?? ""} onChange={(e) => setTxDraft({ ...txDraft, note: e.target.value })} className="min-h-[60px]" />
            </Field>
            {txDraft.amount ? <p className="col-span-2 text-xs text-slate-500">{formatMoney(Number(txDraft.amount))}</p> : null}
          </div>
        )}
      </Modal>

      {/* Budget modal */}
      <Modal
        open={budgetOpen}
        onClose={() => setBudgetOpen(false)}
        title={`سقف بودجه ${monthKeyLabel(monthKey)}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setBudgetOpen(false)}>انصراف</Button>
            <Button onClick={saveBudgets} loading={saving}>ذخیره</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          {EXPENSE_CATS.map((c) => (
            <Field key={c} label={c}>
              <Input type="number" min={0} step={100000} value={budgetForm[c] ?? 0} onChange={(e) => setBudgetForm({ ...budgetForm, [c]: Number(e.target.value) })} />
            </Field>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">مبالغ به تومان؛ دسته‌هایی با مقدار صفر نادیده گرفته می‌شوند.</p>
      </Modal>

      {/* Goal modal */}
      <Modal
        open={!!goalDraft}
        onClose={() => setGoalDraft(null)}
        title={goalDraft?.id ? "ویرایش هدف مالی" : "هدف مالی جدید"}
        footer={
          <>
            {goalDraft?.id && (
              <Button variant="danger" className="ml-auto" onClick={async () => { if (confirm("حذف شود؟")) { await remove("financial_goals", goalDraft.id!); setGoalDraft(null); reload(true); } }}>
                <Trash2 size={14} /> حذف
              </Button>
            )}
            <Button variant="ghost" onClick={() => setGoalDraft(null)}>انصراف</Button>
            <Button onClick={saveGoal} loading={saving}>ذخیره</Button>
          </>
        }
      >
        {goalDraft && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="نام هدف" className="col-span-2">
              <Input value={goalDraft.name ?? ""} onChange={(e) => setGoalDraft({ ...goalDraft, name: e.target.value })} placeholder="مثلاً: صندوق اضطراری" />
            </Field>
            <Field label="مبلغ هدف (تومان)">
              <Input type="number" min={0} step={1000000} value={goalDraft.targetAmount ?? ""} onChange={(e) => setGoalDraft({ ...goalDraft, targetAmount: Number(e.target.value) })} />
            </Field>
            <Field label="پس‌انداز فعلی">
              <Input type="number" min={0} step={100000} value={goalDraft.savedAmount ?? 0} onChange={(e) => setGoalDraft({ ...goalDraft, savedAmount: Number(e.target.value) })} />
            </Field>
            <Field label="مهلت" className="col-span-2">
              <Input type="date" value={goalDraft.deadline ?? ""} onChange={(e) => setGoalDraft({ ...goalDraft, deadline: e.target.value })} />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
