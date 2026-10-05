import { useContext, type ReactNode } from 'react';
import { Link } from '../router';
import type { Block, CalloutKind, Inline, Level } from './ast';
import { CopyContext } from './copy';

/**
 * Renders a chapter's AST (src/floorspec/ast.ts) as React elements — never as an HTML string.
 * Every colour is a system token; the spec's own structure (section numbers, statement IDs)
 * becomes ids that can be linked to.
 */


const LEVEL_STYLE: Record<Level, string> = {
  MUST: 'bg-accent-muted text-accent',
  'MUST NOT': 'bg-accent-muted text-accent',
  SHOULD: 'bg-info-muted text-info',
  'SHOULD NOT': 'bg-info-muted text-info',
  MAY: 'bg-surface-raised text-fg-muted',
};

/** The level of a normative statement, as a small label. */
export function LevelBadge({ level }: { level: Level }) {
  return (
    <span className={`rounded-full px-2 py-0.5 font-mono text-11 font-semibold tracking-label whitespace-nowrap uppercase ${LEVEL_STYLE[level]}`}>
      {level}
    </span>
  );
}

/**
 * A statement's tag: its level and short number, linking to itself. Using it puts the statement's
 * address in the bar and, where the browser allows, copies it.
 */
function StatementBadge({ id, level }: { id: string; level: Level }) {
  const copied = useContext(CopyContext);
  const short = id.replace(/^FS-[A-Z]+-/, '');
  return (
    <a
      href={`#${id}`}
      onClick={() => copied(id)}
      title={`${id} — copy a link to this statement`}
      aria-label={`${id}, ${level}. Copy a link to this statement`}
      className={`ml-1.5 inline-flex translate-y-[-1px] items-center gap-1.5 rounded-full px-2 py-0.5 align-middle font-mono text-11 font-semibold tracking-label whitespace-nowrap uppercase no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${LEVEL_STYLE[level]}`}
    >
      {level}
      <span className="font-normal opacity-80">{short}</span>
    </a>
  );
}

function Inlines({ items }: { items: Inline[] }) {
  return (
    <>
      {items.map((item, index) => (
        <InlineNode key={index} item={item} />
      ))}
    </>
  );
}

const LINK = 'text-accent underline decoration-border-field underline-offset-4 hover:decoration-accent';

function InlineNode({ item }: { item: Inline }): ReactNode {
  if (typeof item === 'string') return item;
  switch (item.t) {
    case 'code':
      // A short name (`FS-JSON-001`, `level`) never breaks across lines; a long expression may.
      return (
        <code className={`rounded-sm bg-surface-raised px-1 py-0.5 font-mono text-fg ${item.v.length <= 24 ? 'whitespace-nowrap' : ''}`}>
          {item.v}
        </code>
      );
    case 'em':
      return (
        <em>
          <Inlines items={item.c} />
        </em>
      );
    case 'strong':
      return (
        <strong className="font-semibold text-fg">
          <Inlines items={item.c} />
        </strong>
      );
    case 'br':
      return <br />;
    case 'a':
      if (item.href.startsWith('/')) {
        return (
          <Link to={item.href} className={LINK}>
            <Inlines items={item.c} />
          </Link>
        );
      }
      return (
        <a href={item.href} className={LINK}>
          <Inlines items={item.c} />
        </a>
      );
    case 'stmt':
      return (
        <span
          id={item.id}
          className="scroll-mt-28 rounded-sm box-decoration-clone transition-colors duration-3 target:bg-warning-muted target:outline-4 target:outline-warning-muted"
        >
          <Inlines items={item.c} />
          <StatementBadge id={item.id} level={item.level} />
        </span>
      );
  }
}

const CALLOUT: Record<CalloutKind, { label: string; frame: string; kicker: string }> = {
  note: { label: 'Note', frame: 'border-info bg-info-muted', kicker: 'text-info' },
  example: { label: 'Example', frame: 'border-success bg-success-muted', kicker: 'text-success' },
  warning: { label: 'Warning', frame: 'border-warning bg-warning-muted', kicker: 'text-warning' },
};

/** A Markdown table, scrolling sideways on a narrow screen rather than squeezing its columns. */
function Table({ block }: { block: Extract<Block, { t: 'table' }> }) {
  const align = (index: number) =>
    block.align[index] === 'right' ? 'text-right' : block.align[index] === 'center' ? 'text-center' : 'text-left';
  return (
    <div
      className="overflow-x-auto rounded-md border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      tabIndex={0}
      role="region"
      aria-label="Table, scrolls sideways"
    >
      <table className="w-full border-collapse text-14">
        <thead className="bg-surface">
          <tr>
            {block.head.map((cell, index) => (
              <th key={index} scope="col" className={`border-b border-border px-3 py-2 font-semibold text-fg ${align(index)}`}>
                <Inlines items={cell} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, r) => (
            <tr key={r} className="border-b border-border last:border-b-0">
              {row.map((cell, index) => (
                <td key={index} className={`px-3 py-2 align-top text-fg-muted ${align(index)}`}>
                  <Inlines items={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block, index) => (
        <BlockNode key={index} block={block} />
      ))}
    </>
  );
}

function BlockNode({ block }: { block: Block }): ReactNode {
  switch (block.t) {
    case 'h': {
      const title = (
        <>
          {block.number && <span className="mr-3 font-mono text-fg-faint">{block.number}</span>}
          <Inlines items={block.c} />
          <a
            href={`#${block.id}`}
            aria-label={`Link to section ${block.number ?? ''}`}
            className="ml-2 text-fg-faint no-underline opacity-0 group-hover:opacity-100 hover:text-accent focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-focus"
          >
            #
          </a>
        </>
      );
      return block.depth === 2 ? (
        <h2 id={block.id} className="group scroll-mt-28 border-t border-border pt-10 text-24 font-semibold text-fg first:border-t-0 first:pt-0">
          {title}
        </h2>
      ) : (
        <h3 id={block.id} className="group scroll-mt-28 pt-2 text-20 font-semibold text-fg">
          {title}
        </h3>
      );
    }
    case 'p':
      return (
        <p className="text-16 leading-relaxed text-fg">
          <Inlines items={block.c} />
        </p>
      );
    case 'list': {
      const items = block.items.map((item, index) => (
        // A list item stays display: list-item — as a flex box it would lose its marker, and Ops
        // refers to its numbered steps ("steps 2 to 4", "step 6").
        <li key={index} className="space-y-2 pl-1 text-16 leading-relaxed text-fg">
          <Blocks blocks={item} />
        </li>
      ));
      return block.ordered ? (
        <ol start={block.start} className="flex list-decimal flex-col gap-2 pl-6 marker:text-fg-muted">
          {items}
        </ol>
      ) : (
        <ul className="flex list-disc flex-col gap-2 pl-6 marker:text-fg-faint">{items}</ul>
      );
    }
    case 'table':
      return <Table block={block} />;
    case 'code':
      return (
        <pre
          tabIndex={0}
          aria-label={block.lang ? `${block.lang} example` : 'Example'}
          className="overflow-x-auto rounded-md bg-surface p-4 font-mono text-12 leading-relaxed text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <code>{block.v}</code>
        </pre>
      );
    case 'callout': {
      const style = CALLOUT[block.kind];
      return (
        <aside className={`flex flex-col gap-3 rounded-md border-l-4 p-5 ${style.frame}`} aria-label={style.label}>
          <p className={`font-mono text-11 font-semibold tracking-label uppercase ${style.kicker}`}>
            {style.label}
            {block.title.length > 0 && (
              <span className="ml-2 font-sans text-14 font-semibold tracking-normal text-fg normal-case">
                <Inlines items={block.title} />
              </span>
            )}
          </p>
          <Blocks blocks={block.c} />
        </aside>
      );
    }
    case 'quote':
      return (
        <blockquote className="flex flex-col gap-3 border-l-2 border-border-field pl-5 text-fg-muted">
          <Blocks blocks={block.c} />
        </blockquote>
      );
    case 'hr':
      return <hr className="border-border" />;
  }
}
