import { Fragment, type ReactNode } from "react";
import { Link } from "react-router-dom";

/** Markdown mínimo e seguro: parágrafos, listas "- ", **negrito** e [texto](link). */
function inline(t: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[(.+?)\]\((\S+?)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(t))) {
    if (m.index > last) out.push(t.slice(last, m.index));
    if (m[1]) out.push(<strong key={k++}>{m[1]}</strong>);
    else if (m[3].startsWith("/")) out.push(<Link key={k++} to={m[3]} className="underline">{m[2]}</Link>);
    else if (/^(https?:|mailto:)/.test(m[3])) out.push(<a key={k++} href={m[3]} target="_blank" rel="noopener noreferrer" className="underline">{m[2]}</a>);
    else out.push(m[2]);
    last = re.lastIndex;
  }
  if (last < t.length) out.push(t.slice(last));
  return out;
}

export default function MarkdownSimples({ texto }: { texto: string }) {
  const blocos = (texto || "").trim().split(/\n\s*\n/);
  return (
    <>
      {blocos.map((b, i) => {
        const linhas = b.split("\n");
        if (linhas.every((l) => /^\s*-\s+/.test(l)))
          return (
            <ul key={i} className="mb-2 list-disc space-y-1 pl-5">
              {linhas.map((l, j) => <li key={j}>{inline(l.replace(/^\s*-\s+/, ""))}</li>)}
            </ul>
          );
        return (
          <p key={i} className="mb-2 last:mb-0">
            {linhas.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l)}</Fragment>)}
          </p>
        );
      })}
    </>
  );
}
