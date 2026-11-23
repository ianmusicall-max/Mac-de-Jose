import type { Metadata } from 'next';
import { ToolPage } from '@/components/tool-page';
import { TOOLS } from '@/lib/tools';

const tool = TOOLS.find(entry => entry.path === '/tiktok')!;

export const metadata: Metadata = {
  title: tool.title,
  description: tool.description,
  alternates: { canonical: tool.path },
};

export default function Page() {
  return <ToolPage tool={tool} />;
}
