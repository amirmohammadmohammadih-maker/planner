"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import type { Task } from "@/db/schema";
import { create, remove, update } from "@/lib/api";
import { formatJalali } from "@/lib/jalali";
import { Button, Field, Input, Modal, Select, Textarea, TASK_CATEGORIES } from "./ui";

export type TaskDraft = Partial<Task> & { date: string };

export default function TaskModal({
  draft,
  onClose,
  onSaved,
}: {
  draft: TaskDraft | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<TaskDraft>({ date: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (draft)
      setForm({
        title: "",
        description: "",
        startTime: "",
        endTime: "",
        priority: "medium",
        status: "todo",
        category: "کار",
        ...draft,
      });
    setError(null);
  }, [draft]);

  const set = (k: keyof TaskDraft, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    if (!form.title?.trim()) return setError("عنوان کار را وارد کنید");
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description || null,
        date: form.date,
        startTime: form.startTime || null,
        endTime: form.endTime || null,
        priority: form.priority,
        status: form.status,
        category: form.category,
      };
      if (form.id) await update("tasks", form.id, payload);
      else await create("tasks", payload);
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function del() {
    if (!form.id || !confirm("این کار حذف شود؟")) return;
    setSaving(true);
    await remove("tasks", form.id);
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal
      open={!!draft}
      onClose={onClose}
      title={form.id ? "ویرایش کار" : "کار جدید"}
      footer={
        <>
          {form.id && (
            <Button variant="danger" onClick={del} disabled={saving} className="ml-auto">
              <Trash2 size={14} /> حذف
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          <Button onClick={save} loading={saving}>
            ذخیره
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="عنوان">
          <Input autoFocus value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} placeholder="مثلاً: جلسه هفتگی تیم" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`تاریخ (${form.date ? formatJalali(form.date, "short") : ""})`}>
            <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
          </Field>
          <Field label="دسته‌بندی">
            <Select value={form.category ?? "کار"} onChange={(e) => set("category", e.target.value)}>
              {TASK_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="ساعت شروع">
            <Input type="time" value={form.startTime ?? ""} onChange={(e) => set("startTime", e.target.value)} />
          </Field>
          <Field label="ساعت پایان">
            <Input type="time" value={form.endTime ?? ""} onChange={(e) => set("endTime", e.target.value)} />
          </Field>
          <Field label="اولویت">
            <Select value={form.priority ?? "medium"} onChange={(e) => set("priority", e.target.value)}>
              <option value="high">زیاد</option>
              <option value="medium">متوسط</option>
              <option value="low">کم</option>
            </Select>
          </Field>
          <Field label="وضعیت">
            <Select value={form.status ?? "todo"} onChange={(e) => set("status", e.target.value)}>
              <option value="todo">انجام نشده</option>
              <option value="doing">در حال انجام</option>
              <option value="done">انجام شده</option>
            </Select>
          </Field>
        </div>
        <Field label="توضیحات">
          <Textarea value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="جزئیات اختیاری…" />
        </Field>
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </div>
    </Modal>
  );
}
