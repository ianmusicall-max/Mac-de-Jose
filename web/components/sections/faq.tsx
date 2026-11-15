import type { Tool } from '@/lib/tools';

/**
 * Plain <details> elements: the accordion works before any JavaScript loads, and
 * screen readers get the open/closed state for free.
 */
export function Faq({ items }: { items: Tool['faq'] }) {
  return (
    <section className="band" aria-labelledby="faq">
      <h2 id="faq" className="band-title">
        Preguntas frecuentes
      </h2>
      <div className="faq">
        {items.map(item => (
          <details key={item.question}>
            <summary>
              <h3>{item.question}</h3>
            </summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
