import type { Tool } from '@/lib/tools';

export function HowItWorks({ steps }: { steps: Tool['steps'] }) {
  return (
    <section className="band" aria-labelledby="pasos">
      <h2 id="pasos" className="band-title">
        Cómo funciona
      </h2>
      <ol className="steps">
        {steps.map((step, index) => (
          <li key={step.heading}>
            <span className="step-number">{String(index + 1).padStart(2, '0')}</span>
            <h3>{step.heading}</h3>
            <p>{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
