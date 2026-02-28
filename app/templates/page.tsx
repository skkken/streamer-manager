import AdminLayout from '@/components/layout/AdminLayout'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import { createServerClient } from '@/lib/supabase/server'
import { SelfCheckTemplate } from '@/lib/types'
import TemplateActions from './TemplateActions'

async function getTemplates(): Promise<SelfCheckTemplate[]> {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('self_check_templates')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  } catch {
    return []
  }
}

export default async function TemplatesPage() {
  const templates = await getTemplates()

  return (
    <AdminLayout title="テンプレ管理">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{templates.length} 件</p>
        <Link href="/templates/new">
          <Button size="sm">+ 新規作成</Button>
        </Link>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 text-gray-600 font-medium">テンプレ名</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">対象レベル</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">フィールド数</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">状態</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">作成日</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{t.name}</td>
                  <td className="px-6 py-3 text-gray-500">
                    {t.for_level === 0 ? 'Lv0（全員）' : `Lv${t.for_level}`}
                  </td>
                  <td className="px-6 py-3 text-gray-500">
                    {(t.schema as { fields?: unknown[] })?.fields?.length ?? 0}
                  </td>
                  <td className="px-6 py-3">
                    <Badge variant={t.is_active ? 'green' : 'gray'}>
                      {t.is_active ? 'アクティブ' : '非アクティブ'}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-gray-500">
                    {new Date(t.created_at).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-6 py-3">
                    <TemplateActions id={t.id} name={t.name} isActive={t.is_active} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminLayout>
  )
}
