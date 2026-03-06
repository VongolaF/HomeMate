"use client";

import { useEffect, useState } from "react";
import type { UserCategory } from "@/types/transactions";

export interface CategoryFormValues {
  id?: string;
  name: string;
  icon?: string | null;
  type: "income" | "expense";
  sort_order?: number;
  is_active?: boolean;
}

interface CategoryManagerProps {
  open: boolean;
  onClose: () => void;
  categories: UserCategory[];
  onSave: (values: CategoryFormValues) => void;
  onDeactivate: (categoryId: string) => void;
}

const EMPTY_FORM: CategoryFormValues = {
  name: "",
  icon: "",
  type: "expense",
  sort_order: 0,
  is_active: true,
};

export default function CategoryManager({
  open,
  onClose,
  categories,
  onSave,
  onDeactivate,
}: CategoryManagerProps) {
  const [form, setForm] = useState<CategoryFormValues>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM);
      setEditingId(null);
    }
  }, [open]);

  const handleEdit = (category: UserCategory) => {
    setEditingId(category.id);
    setForm({
      id: category.id,
      name: category.name,
      icon: category.icon ?? "",
      type: category.type,
      sort_order: category.sort_order,
      is_active: category.is_active,
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name?.trim()) return;

    onSave({
      ...form,
      id: editingId ?? form.id,
      name: form.name.trim(),
      icon: form.icon?.trim() || null,
      sort_order: Number(form.sort_order ?? 0),
      is_active: Boolean(form.is_active),
    });

    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-4xl rounded-2xl border border-line bg-surface p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink">分类管理</h3>
          <button type="button" onClick={onClose} className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink">
            关闭
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="grid grid-cols-[2fr_1fr_1fr] gap-3 max-md:grid-cols-1">
            <label className="grid gap-1 text-sm text-ink">
              <span className="text-muted">名称</span>
              <input
                value={form.name ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="rounded-xl border border-line px-3 py-2 outline-none focus:border-primary"
                placeholder="分类名称"
                required
              />
            </label>
            <label className="grid gap-1 text-sm text-ink">
              <span className="text-muted">类型</span>
              <select
                value={form.type}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, type: event.target.value as "income" | "expense" }))
                }
                className="rounded-xl border border-line px-3 py-2 outline-none focus:border-primary"
              >
                <option value="expense">支出</option>
                <option value="income">收入</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm text-ink">
              <span className="text-muted">排序</span>
              <input
                type="number"
                min="0"
                value={form.sort_order ?? 0}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, sort_order: Number(event.target.value || 0) }))
                }
                className="rounded-xl border border-line px-3 py-2 outline-none focus:border-primary"
              />
            </label>
          </div>

          <div className="grid grid-cols-[2fr_1fr] gap-3 max-md:grid-cols-1">
            <label className="grid gap-1 text-sm text-ink">
              <span className="text-muted">图标</span>
              <input
                value={form.icon ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, icon: event.target.value }))}
                className="rounded-xl border border-line px-3 py-2 outline-none focus:border-primary"
                placeholder="可选"
              />
            </label>
            <label className="flex items-center gap-2 self-end text-sm text-ink">
              <input
                type="checkbox"
                checked={Boolean(form.is_active)}
                onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
              />
              启用
            </label>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">
              {editingId ? "保存修改" : "添加分类"}
            </button>
            <button
              type="button"
              onClick={() => {
                setForm(EMPTY_FORM);
                setEditingId(null);
              }}
              className="rounded-xl border border-line px-4 py-2 text-sm text-ink"
            >
              清空输入
            </button>
          </div>
        </form>

        <div className="mt-5 overflow-x-auto rounded-xl border border-line">
          <table className="min-w-full text-sm">
            <thead className="bg-primarySoft/60 text-left text-ink">
              <tr>
                <th className="px-3 py-2">名称</th>
                <th className="px-3 py-2">类型</th>
                <th className="px-3 py-2">排序</th>
                <th className="px-3 py-2">启用</th>
                <th className="px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className="border-t border-line">
                  <td className="px-3 py-2">{category.name}</td>
                  <td className="px-3 py-2">{category.type === "income" ? "收入" : "支出"}</td>
                  <td className="px-3 py-2">{category.sort_order}</td>
                  <td className="px-3 py-2">{category.is_active ? "是" : "否"}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-line px-2 py-1 text-xs text-ink"
                        onClick={() => handleEdit(category)}
                      >
                        改一下
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 disabled:opacity-50"
                        onClick={() => onDeactivate(category.id)}
                        disabled={!category.is_active}
                      >
                        先停用
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
