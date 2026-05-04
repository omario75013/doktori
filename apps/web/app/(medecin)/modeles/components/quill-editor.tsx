"use client";

import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  dir?: "ltr" | "rtl";
  readOnly?: boolean;
  minHeight?: string;
}

const TOOLBAR = [
  [{ header: [1, 2, 3, false] }],
  ["bold", "italic", "underline", "strike"],
  [{ color: [] }, { background: [] }],
  [{ list: "ordered" }, { list: "bullet" }],
  [{ align: [] }],
  ["link", "blockquote", "code-block"],
  ["clean"],
];

export function QuillEditor({
  value,
  onChange,
  placeholder,
  dir = "ltr",
  readOnly = false,
  minHeight = "400px",
}: Props) {
  return (
    <div className="quill-wrapper" dir={dir} style={{ ["--quill-min-h" as string]: minHeight }}>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        modules={{ toolbar: readOnly ? false : TOOLBAR }}
      />
      <style jsx global>{`
        .quill-wrapper .ql-container {
          min-height: var(--quill-min-h, 400px);
          font-size: 14px;
          font-family: ui-sans-serif, system-ui, sans-serif;
          border-bottom-left-radius: 0.5rem;
          border-bottom-right-radius: 0.5rem;
        }
        .quill-wrapper .ql-toolbar {
          border-top-left-radius: 0.5rem;
          border-top-right-radius: 0.5rem;
        }
        .quill-wrapper .ql-editor {
          min-height: var(--quill-min-h, 400px);
        }
        .quill-wrapper[dir="rtl"] .ql-editor {
          direction: rtl;
          text-align: right;
        }
        .quill-wrapper .ql-editor.ql-blank::before {
          font-style: normal;
          color: rgb(156 163 175);
        }
      `}</style>
    </div>
  );
}
