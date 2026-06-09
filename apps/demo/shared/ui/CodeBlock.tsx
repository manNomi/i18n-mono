"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

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
    <div className={`demo-code-block ${className}`}>
      <div className="demo-code-bar">
        <span className="demo-code-dot" aria-hidden="true">
          <i style={{ background: "#ff5f57" }} />
          <i style={{ background: "#febc2e" }} />
          <i style={{ background: "#28c840" }} />
        </span>
        <span className="ml-2">example.{language}</span>
        <span className="ml-auto uppercase tracking-[0.14em]">{language}</span>
      </div>
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          showLineNumbers={showLineNumbers}
          wrapLongLines
          customStyle={{
            margin: 0,
            padding: "1.05rem",
            background: "transparent",
            color: "var(--text)",
            fontSize: "0.875rem",
            lineHeight: 1.65,
            minWidth: "100%",
          }}
          codeTagProps={{
            style: {
              fontFamily: "var(--font-code)",
              overflowWrap: "anywhere",
              whiteSpace: "pre-wrap",
            },
          }}
        >
          {children}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
