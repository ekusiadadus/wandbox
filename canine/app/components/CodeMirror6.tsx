import React, { useLayoutEffect, useRef, useState } from "react";
import {
  EditorView,
  keymap,
  highlightSpecialChars,
  drawSelection,
  highlightActiveLine,
  KeyBinding,
} from "@codemirror/view";
import {
  Extension,
  EditorState,
  StateEffect,
  Transaction,
  StateCommand,
} from "@codemirror/state";
import { history, historyKeymap } from "@codemirror/history";
import { foldGutter, foldKeymap } from "@codemirror/fold";
import { indentOnInput, getIndentUnit, indentUnit } from "@codemirror/language";
import { lineNumbers, highlightActiveLineGutter } from "@codemirror/gutter";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching } from "@codemirror/matchbrackets";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/closebrackets";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { commentKeymap } from "@codemirror/comment";
import { rectangularSelection } from "@codemirror/rectangular-selection";
import { defaultHighlightStyle } from "@codemirror/highlight";
import { lintKeymap } from "@codemirror/lint";
//import {
//  oneDarkTheme,
//  oneDarkHighlightStyle,
//} from "@codemirror/theme-one-dark";
//import { cpp } from "@codemirror/lang-cpp";
import { useEffect } from "react";
import { tags, HighlightStyle } from "@codemirror/highlight";

// --color-prettylights-syntax-comment: #6e7781;
// --color-prettylights-syntax-constant: #0550ae;
// --color-prettylights-syntax-entity: #8250df;
// --color-prettylights-syntax-storage-modifier-import: #24292f;
// --color-prettylights-syntax-entity-tag: #116329;
// --color-prettylights-syntax-keyword: #cf222e;
// --color-prettylights-syntax-string: #0a3069;
// --color-prettylights-syntax-variable: #953800;
// --color-prettylights-syntax-brackethighlighter-unmatched: #82071e;
// --color-prettylights-syntax-invalid-illegal-text: #f6f8fa;
// --color-prettylights-syntax-invalid-illegal-bg: #82071e;
// --color-prettylights-syntax-carriage-return-text: #f6f8fa;
// --color-prettylights-syntax-carriage-return-bg: #cf222e;
// --color-prettylights-syntax-string-regexp: #116329;
// --color-prettylights-syntax-markup-list: #3b2300;
// --color-prettylights-syntax-markup-heading: #0550ae;
// --color-prettylights-syntax-markup-italic: #24292f;
// --color-prettylights-syntax-markup-bold: #24292f;
// --color-prettylights-syntax-markup-deleted-text: #82071e;
// --color-prettylights-syntax-markup-deleted-bg: #FFEBE9;
// --color-prettylights-syntax-markup-inserted-text: #116329;
// --color-prettylights-syntax-markup-inserted-bg: #dafbe1;
// --color-prettylights-syntax-markup-changed-text: #953800;
// --color-prettylights-syntax-markup-changed-bg: #ffd8b5;
// --color-prettylights-syntax-markup-ignored-text: #eaeef2;
// --color-prettylights-syntax-markup-ignored-bg: #0550ae;
// --color-prettylights-syntax-meta-diff-range: #8250df;
// --color-prettylights-syntax-brackethighlighter-angle: #57606a;
// --color-prettylights-syntax-sublimelinter-gutter-mark: #8c959f;
// --color-prettylights-syntax-constant-other-reference-link: #0a3069;
const highlightStyle = HighlightStyle.define([
  { tag: tags.comment, color: "#6e7781" },
  { tag: tags.literal, color: "#0550ae" },
  { tag: tags.keyword, color: "#8250df" },
  { tag: tags.typeName, color: "#8250df" },
  { tag: tags.string, color: "#cf222e" },
  { tag: tags.variableName, color: "#953800" },
  { tag: tags.processingInstruction, color: "#0a3069" },
  // --color-prettylights-syntax-constant: #0550ae;
  // --color-prettylights-syntax-entity: #8250df;
  // --color-prettylights-syntax-storage-modifier-import: #24292f;
  // --color-prettylights-syntax-entity-tag: #116329;
  // --color-prettylights-syntax-keyword: #cf222e;
  // --color-prettylights-syntax-string: #0a3069;
  // --color-prettylights-syntax-variable: #953800;
]);

export const insertTabWithSpace: StateCommand = ({ state, dispatch }) => {
  const cursor =
    state.selection.main.head -
    state.doc.lineAt(state.selection.main.head).from;
  const indentUnit = getIndentUnit(state);
  const newCursor = Math.floor((cursor + indentUnit) / indentUnit) * indentUnit;
  const indentNum = newCursor - cursor;
  const spaces = Array(indentNum + 1).join(" ");
  dispatch(
    state.update(state.replaceSelection(spaces), {
      scrollIntoView: true,
      annotations: Transaction.userEvent.of("input"),
    })
  );
  return true;
};

export const removeTabWithSpace: StateCommand = ({ state, dispatch }) => {
  const cursor =
    state.selection.main.head -
    state.doc.lineAt(state.selection.main.head).from;
  const indentUnit = getIndentUnit(state);
  const newCursor = Math.floor((cursor - 1) / indentUnit) * indentUnit;
  if (newCursor < 0) {
    return true;
  }
  const removeNum = cursor - newCursor;
  const newHead = state.selection.main.head - removeNum;
  dispatch(
    state.update(
      {
        changes: {
          from: newHead,
          to: state.selection.main.head,
          insert: "",
        },
      },
      { selection: { anchor: newHead } },
      {
        scrollIntoView: true,
        annotations: Transaction.userEvent.of("delete"),
      }
    )
  );
  return true;
};

export const tabWithSpaceBinding: KeyBinding = {
  key: "Tab",
  run: insertTabWithSpace,
  shift: removeTabWithSpace,
};

const codeMirrorDefaultExtensions: Extension[] = [
  //highlightSpecialChars({ replaceTabs: true }),
  history(),
  foldGutter(),
  drawSelection(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  highlightStyle,
  closeBrackets(),
  autocompletion(),
  rectangularSelection(),
  highlightSelectionMatches(),
];

const defaultKeyMaps: KeyBinding[] = [
  ...closeBracketsKeymap,
  ...defaultKeymap,
  ...searchKeymap,
  ...historyKeymap,
  ...foldKeymap,
  ...commentKeymap,
  ...completionKeymap,
  ...lintKeymap,
];

export interface CodeMirror6Option {
  lineNumbers?: boolean;
  theme?: string;
  mode?: string;
  indentUnit?: number;
  indentWithTab?: boolean;
  tabSize?: number;
  keymaps?: KeyBinding[];
  viewportMargin?: number;
  readOnly?: boolean;
  languageSupport?: Extension;
}

export interface CodeMirror6Props {
  className?: string;
  style?: React.CSSProperties;
  text: string;
  option: CodeMirror6Option;
  onViewCreated: (view: EditorView) => void;
  onViewDestroyed: (view: EditorView) => void;
  onChange?: (view: EditorView) => void;
}

function optionToExtension(option: CodeMirror6Option): Extension[] {
  const ext = [...codeMirrorDefaultExtensions];
  if (option.lineNumbers) {
    ext.push(lineNumbers());
  }
  if (option.readOnly) {
    ext.push(EditorView.editable.of(false));
  } else {
    ext.push(
      highlightActiveLineGutter(),
      highlightActiveLine(),
      bracketMatching()
    );
    const keymaps = [...defaultKeyMaps];
    if (option.indentWithTab) {
      keymaps.push(indentWithTab);
      ext.push(indentUnit.of("\t"));
      if (option.tabSize !== undefined) {
        ext.push(EditorState.tabSize.of(option.tabSize));
      }
    } else {
      keymaps.push(tabWithSpaceBinding);
      if (option.indentUnit !== undefined) {
        ext.push(indentUnit.of(Array(option.indentUnit + 1).join(" ")));
      }
    }
    if (option.keymaps) {
      keymaps.unshift(...option.keymaps);
      console.log(keymaps);
    }

    ext.push(keymap.of(keymaps));
  }
  if (option.languageSupport !== undefined) {
    ext.push(option.languageSupport);
  }
  return ext;
}

const CodeMirror6 = (props: CodeMirror6Props): React.ReactElement => {
  const {
    className,
    style,
    text,
    option,
    onViewCreated,
    onViewDestroyed,
    onChange,
  } = props;

  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<EditorView | null>(null);

  useLayoutEffect(() => {
    const startState = EditorState.create({
      doc: text,
      extensions: optionToExtension(option),
    });

    const dispatch = (tr: Transaction) => {
      view.update([tr]);
      if (!tr.changes.empty && onChange !== undefined) {
        onChange(view);
      }
    };
    const view = new EditorView({
      state: startState,
      parent: ref.current || undefined,
      dispatch: dispatch,
    });

    setView(view);
    onViewCreated(view);

    return () => {
      onViewDestroyed(view);
      view.destroy();
    };
  }, [ref]);

  useEffect(() => {
    if (view === null) {
      return;
    }

    // text が書き換わったら view 全体をそのテキストに置き換える
    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: text,
      },
    });
  }, [text]);

  useEffect(() => {
    if (view === null) {
      return;
    }
    view.dispatch({
      effects: StateEffect.reconfigure.of(optionToExtension(option)),
    });
  }, [option]);

  return <div className={className} style={style} ref={ref}></div>;
};

export { CodeMirror6 };
