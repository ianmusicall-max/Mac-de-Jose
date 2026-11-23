import { ArrowUpRight } from 'lucide-react';
import { otherTools } from '@/lib/tools';

export function ToolLinks({ current }: { current: string }) {
  const tools = otherTools(current);
  if (!tools.length) return null;

  return (
    <section className="band" aria-labelledby="otras">
      <h2 id="otras" className="band-title">
        Otras herramientas
      </h2>
      <div className="tool-links">
        {tools.map(tool => (
          <a key={tool.path} href={tool.path} className="tool-link">
            <h3>
              {tool.heading} {tool.headingAccent}
            </h3>
            <p>{tool.intro}</p>
            <span className="tool-link-go">
              Abrir <ArrowUpRight size={15} />
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
