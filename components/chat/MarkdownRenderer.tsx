"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { CodeBlock } from "./CodeBlock";

interface MarkdownRendererProps {
  content: string;
  isStreaming: boolean;
}

export function MarkdownRenderer({ content, isStreaming }: MarkdownRendererProps) {
  const components: Components = {
    code(props) {
      const { className, children } = props;
      const match = /language-(\w+)/.exec(className ?? "");
      const isInline = !match && !String(children).includes("\n");

      if (isInline) {
        return (
          <code className="rounded bg-canvas px-1.5 py-0.5 font-mono text-[0.85em] text-accent">
            {children}
          </code>
        );
      }

      return (
        <CodeBlock
          language={match?.[1] ?? "text"}
          value={String(children).replace(/\n$/, "")}
          isStreaming={isStreaming}
        />
      );
    },
    a(props) {
      return <a {...props} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2" />;
    },
  };

  return (
    <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:m-0 prose-pre:bg-transparent prose-pre:p-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
