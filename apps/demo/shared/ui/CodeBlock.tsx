"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

interface CodeBlockProps {
  children: string;
  language?: string;
  className?: string;
  showLineNumbers?: boolean;
}

export function CodeBlock({
  children,
  language = "typescript",
  className = "",
  showLineNumbers = false,
}: CodeBlockProps) {
  return (
    <div
      className={`overflow-x-auto rounded-lg border border-slate-200 bg-white ${className}`}
    >
      <SyntaxHighlighter
        language={language}
        style={oneLight}
        showLineNumbers={showLineNumbers}
        wrapLongLines
        customStyle={{
          margin: 0,
          padding: "1rem",
          background: "#ffffff",
          fontSize: "0.875rem",
          minWidth: "100%",
        }}
        codeTagProps={{
          style: {
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            overflowWrap: "anywhere",
            whiteSpace: "pre-wrap",
          },
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}
