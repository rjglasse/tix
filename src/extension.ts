import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const CONTEXT_COLORS = [
  '#F48771', // coral red
  '#4EC9B0', // teal
  '#DCDCAA', // yellow
  '#C586C0', // purple
  '#6BCB6B', // green
  '#CE9178', // orange
  '#9CDCFE', // light blue
  '#D16969', // red
  '#4FC1FF', // cyan
  '#E8AB6D', // peach
  '#B5CEA8', // sage green
  '#DA70D6', // orchid
  '#87CEEB', // sky blue
  '#F0E68C', // khaki
  '#FF6B9D', // pink
  '#20B2AA', // light sea green
];

let decorationTypes: Map<string, vscode.TextEditorDecorationType> = new Map();
let contextColorMap: Map<string, number> = new Map();

const projectDecorationType = vscode.window.createTextEditorDecorationType({
  fontWeight: 'bold',
  color: '#6b6b6b',
});

const doneItemDecorationType = vscode.window.createTextEditorDecorationType({
  textDecoration: 'line-through',
  opacity: '0.6',
});

function getContextDecorationType(context: string): vscode.TextEditorDecorationType {
  if (!decorationTypes.has(context)) {
    // Assign next color in rotation
    if (!contextColorMap.has(context)) {
      contextColorMap.set(context, contextColorMap.size % CONTEXT_COLORS.length);
    }
    const colorIndex = contextColorMap.get(context)!;
    const color = CONTEXT_COLORS[colorIndex];

    const decorationType = vscode.window.createTextEditorDecorationType({
      color: color,
    });
    decorationTypes.set(context, decorationType);
  }
  return decorationTypes.get(context)!;
}

function updateDecorations(editor: vscode.TextEditor) {
  if (editor.document.languageId !== 'tix') {
    return;
  }

  // Clear old decorations
  decorationTypes.forEach(decorationType => {
    editor.setDecorations(decorationType, []);
  });

  // Find all contexts, project headers, and done items
  const contextRanges: Map<string, vscode.Range[]> = new Map();
  const projectRanges: vscode.Range[] = [];
  const doneItemRanges: vscode.Range[] = [];
  const contextPattern = /^(\s*)(.+?)\s+-\s/;
  let inDoneSection = false;

  for (let i = 0; i < editor.document.lineCount; i++) {
    const line = editor.document.lineAt(i);
    const text = line.text.trim();

    // Check for project headers
    if (text.endsWith(':') && text.length > 1) {
      projectRanges.push(line.range);
      inDoneSection = text === 'Done:';
      continue;
    }

    // Track done items for strikethrough
    if (inDoneSection && text.length > 0) {
      doneItemRanges.push(line.range);
    }

    const match = line.text.match(contextPattern);
    if (match) {
      const context = match[2];
      const startPos = new vscode.Position(i, match[1].length);
      const endPos = new vscode.Position(i, match[1].length + context.length);
      const range = new vscode.Range(startPos, endPos);

      if (!contextRanges.has(context)) {
        contextRanges.set(context, []);
      }
      contextRanges.get(context)!.push(range);
    }
  }

  // Apply decorations
  editor.setDecorations(projectDecorationType, projectRanges);
  editor.setDecorations(doneItemDecorationType, doneItemRanges);
  contextRanges.forEach((ranges, context) => {
    const decorationType = getContextDecorationType(context);
    editor.setDecorations(decorationType, ranges);
  });
}

class TixCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] {
    // Only suggest at start of line (for context)
    const lineText = document.lineAt(position.line).text;
    const beforeCursor = lineText.substring(0, position.character);

    // Only trigger if we're at the start or typing a context
    if (beforeCursor.includes(' - ')) {
      return [];
    }

    // Collect all existing contexts
    const contexts = new Set<string>();
    const contextPattern = /^(.+?)\s+-\s/;

    for (let i = 0; i < document.lineCount; i++) {
      const match = document.lineAt(i).text.match(contextPattern);
      if (match) {
        contexts.add(match[1]);
      }
    }

    // Create completion items
    return Array.from(contexts).map(ctx => {
      const item = new vscode.CompletionItem(ctx, vscode.CompletionItemKind.Keyword);
      item.insertText = ctx + ' - ';
      item.detail = 'Tix context';
      return item;
    });
  }
}

class TixFoldingRangeProvider implements vscode.FoldingRangeProvider {
  provideFoldingRanges(document: vscode.TextDocument): vscode.FoldingRange[] {
    const ranges: vscode.FoldingRange[] = [];
    let projectStart: number | null = null;

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const text = line.text.trim();

      // Check if this is a project header (ends with :)
      if (text.endsWith(':') && text.length > 1) {
        // Close previous project if exists
        if (projectStart !== null) {
          // Find last non-empty line before this one
          let endLine = i - 1;
          while (endLine > projectStart && document.lineAt(endLine).text.trim() === '') {
            endLine--;
          }
          if (endLine > projectStart) {
            ranges.push(new vscode.FoldingRange(projectStart, endLine));
          }
        }
        projectStart = i;
      }
    }

    // Close final project
    if (projectStart !== null) {
      let endLine = document.lineCount - 1;
      while (endLine > projectStart && document.lineAt(endLine).text.trim() === '') {
        endLine--;
      }
      if (endLine > projectStart) {
        ranges.push(new vscode.FoldingRange(projectStart, endLine));
      }
    }

    return ranges;
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Tix extension activated');

  // Register folding range provider
  context.subscriptions.push(
    vscode.languages.registerFoldingRangeProvider('tix', new TixFoldingRangeProvider())
  );

  // Register completion provider
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider('tix', new TixCompletionProvider())
  );

  // Update decorations for active editor
  if (vscode.window.activeTextEditor) {
    updateDecorations(vscode.window.activeTextEditor);
  }

  // Update decorations when editor changes
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(editor => {
      if (editor) {
        updateDecorations(editor);
      }
    })
  );

  // Update decorations when document changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(event => {
      const editor = vscode.window.activeTextEditor;
      if (editor && event.document === editor.document) {
        updateDecorations(editor);
      }
    })
  );

  // Register the mark done command
  const markDoneCommand = vscode.commands.registerCommand('tix.markDone', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'tix') {
      return;
    }

    const document = editor.document;
    const line = editor.selection.active.line;
    const lineText = document.lineAt(line).text;

    // Skip if line is empty, a project header, or already in Done section
    if (!lineText.trim() || lineText.endsWith(':')) {
      return;
    }

    editor.edit(editBuilder => {
      // Remove the current line
      const lineRange = document.lineAt(line).rangeIncludingLineBreak;
      editBuilder.delete(lineRange);

      // Find or create Done section and add the item
      const text = document.getText();
      const doneMatch = text.match(/^Done:$/m);

      if (doneMatch) {
        // Find the position after "Done:"
        const doneIndex = text.indexOf('Done:');
        const donePosition = document.positionAt(doneIndex + 'Done:'.length);
        editBuilder.insert(new vscode.Position(donePosition.line + 1, 0), lineText + '\n');
      } else {
        // Create Done section at end of file
        const lastLine = document.lineAt(document.lineCount - 1);
        const endPosition = lastLine.range.end;
        editBuilder.insert(endPosition, '\n\nDone:\n' + lineText + '\n');
      }
    });
  });

  context.subscriptions.push(markDoneCommand);

  // Register the sort by context command
  const sortByContextCommand = vscode.commands.registerCommand('tix.sortByContext', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'tix') {
      return;
    }

    const document = editor.document;
    const contextPattern = /^(.+?)\s+-\s/;

    // Parse document into projects
    interface Project {
      header: string;
      items: string[];
      trailingEmpty: number;
    }

    const projects: Project[] = [];
    let currentProject: Project | null = null;

    for (let i = 0; i < document.lineCount; i++) {
      const lineText = document.lineAt(i).text;
      const trimmed = lineText.trim();

      if (trimmed.endsWith(':') && trimmed.length > 1) {
        if (currentProject) {
          projects.push(currentProject);
        }
        currentProject = { header: lineText, items: [], trailingEmpty: 0 };
      } else if (currentProject) {
        if (trimmed === '') {
          currentProject.trailingEmpty++;
        } else {
          // Add any accumulated empty lines as items, then reset
          for (let j = 0; j < currentProject.trailingEmpty; j++) {
            currentProject.items.push('');
          }
          currentProject.trailingEmpty = 0;
          currentProject.items.push(lineText);
        }
      }
    }

    if (currentProject) {
      projects.push(currentProject);
    }

    // Sort items within each project by context
    for (const project of projects) {
      project.items.sort((a, b) => {
        const matchA = a.match(contextPattern);
        const matchB = b.match(contextPattern);
        const contextA = matchA ? matchA[1] : '';
        const contextB = matchB ? matchB[1] : '';
        return contextA.localeCompare(contextB);
      });
    }

    // Rebuild document
    const lines: string[] = [];
    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      lines.push(project.header);
      lines.push(...project.items);
      // Add blank line between projects (except after last)
      if (i < projects.length - 1) {
        lines.push('');
      }
    }

    const fullRange = new vscode.Range(
      new vscode.Position(0, 0),
      document.lineAt(document.lineCount - 1).range.end
    );

    editor.edit(editBuilder => {
      editBuilder.replace(fullRange, lines.join('\n'));
    });
  });

  context.subscriptions.push(sortByContextCommand);

  // Register the archive command
  const archiveCommand = vscode.commands.registerCommand('tix.archive', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'tix') {
      return;
    }

    const document = editor.document;
    const filePath = document.uri.fsPath;
    const archivePath = filePath + '.archive';

    // Find Done section
    let doneStartLine = -1;
    let doneEndLine = -1;

    for (let i = 0; i < document.lineCount; i++) {
      const text = document.lineAt(i).text.trim();
      if (text === 'Done:') {
        doneStartLine = i;
      } else if (doneStartLine >= 0 && text.endsWith(':') && text.length > 1) {
        // Another project started, Done section ends
        doneEndLine = i - 1;
        break;
      }
    }

    // If Done section goes to end of file
    if (doneStartLine >= 0 && doneEndLine < 0) {
      doneEndLine = document.lineCount - 1;
    }

    if (doneStartLine < 0) {
      vscode.window.showInformationMessage('No Done section found');
      return;
    }

    // Collect done items (skip the "Done:" header)
    const doneItems: string[] = [];
    for (let i = doneStartLine + 1; i <= doneEndLine; i++) {
      const text = document.lineAt(i).text;
      if (text.trim()) {
        doneItems.push(text);
      }
    }

    if (doneItems.length === 0) {
      vscode.window.showInformationMessage('No items to archive');
      return;
    }

    // Append to archive file with date header
    const date = new Date().toISOString().split('T')[0];
    const archiveContent = `\nArchived ${date}:\n${doneItems.join('\n')}\n`;

    fs.appendFileSync(archivePath, archiveContent);

    // Remove Done section content (keep the header)
    const doneRange = new vscode.Range(
      new vscode.Position(doneStartLine + 1, 0),
      new vscode.Position(doneEndLine + 1, 0)
    );

    await editor.edit(editBuilder => {
      editBuilder.delete(doneRange);
    });

    vscode.window.showInformationMessage(`Archived ${doneItems.length} items to ${path.basename(archivePath)}`);
  });

  context.subscriptions.push(archiveCommand);
}

export function deactivate() {
  // Dispose all decoration types
  projectDecorationType.dispose();
  doneItemDecorationType.dispose();
  decorationTypes.forEach(decorationType => {
    decorationType.dispose();
  });
  decorationTypes.clear();
  contextColorMap.clear();
}
