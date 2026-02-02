# Tix

A very simple todo list manager that looks quite nice for VS Code.

![Tix](https://raw.githubusercontent.com/rjglasse/tix/main/images/screenshot.png)

## Refreshingly Few Features

- **Color-coded contexts**: Each context gets its own color automatically
- **Foldable projects**: Lines ending with `:` become collapsible sections
- **Mark done**: `⌥D` Moves item to `Done:` section with strikethrough (with sound!)
- **Sort by context**: `⌥S` Groups items by context within each project
- **Generate next actions**: `⌥A` Creates `next.tix` from first `Inbox:` item in each file
- **Archive**: Move completed items to `.tix.archive` with timestamps

## Simple Plaintext Format

```markdown
Project1:
context1 - task description
context2 - task description

Project2:
context1 - task description
context2 - task description
```
