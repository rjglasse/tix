# Purpose

The aim of this project (Tix) is to build a fast and simple todo list extension for VS Code.

Simple text-based todo lists, stored in multiple todo files in a single folder

## Key Features

- file extentions is ".tix"

- Open todo.tix looks like this:

Project:
context1 - item todo 1
context1 - item todo 2
context2 - item todo 2

- Autocolor contexts that match (e.g all context1 is green, context2 is blue, etc)

- Projects are foldable sections of a todo.tix file

- Keyboard short cut to remove item (option+d) and move to a Done: section at the bottom of the file

## General VS C0de Extension Information

Extension File Structure
Text

.
├── .vscode
│   ├── launch.json     // Config for launching and debugging the extension
│   └── tasks.json      // Config for build task that compiles TypeScript
├── .gitignore          // Ignore build output and node_modules
├── README.md           // Readable description of your extension's functionality
├── src
│   └── extension.ts    // Extension source code
├── package.json        // Extension manifest
├── tsconfig.json       // TypeScript configuration
You can read more about the configuration files:

launch.json used to configure VS Code Debugging
tasks.json for defining VS Code Tasks
tsconfig.json consult the TypeScript Handbook
However, let's focus on package.json and extension.ts, which are essential to understanding the Hello World extension.

Extension Manifest
Each VS Code extension must have a package.json as its Extension Manifest. The package.json contains a mix of Node.js fields such as scripts and devDependencies and VS Code specific fields such as publisher, activationEvents and contributes. You can find descriptions of all VS Code specific fields in Extension Manifest Reference. Here are some most important fields:

name and publisher: VS Code uses <publisher>.<name> as a unique ID for the extension. For example, the Hello World sample has the ID vscode-samples.helloworld-sample. VS Code uses the ID to uniquely identify your extension.
main: The extension entry point.
activationEvents and contributes: Activation Events and Contribution Points.
engines.vscode: This specifies the minimum version of VS Code API that the extension depends on.
JSON

{
  "name": "helloworld-sample",
  "displayName": "helloworld-sample",
  "description": "HelloWorld example for VS Code",
  "version": "0.0.1",
  "publisher": "vscode-samples",
  "repository": "https://github.com/microsoft/vscode-extension-samples/helloworld-sample",
  "engines": {
    "vscode": "^1.51.0"
  },
  "categories": ["Other"],
  "activationEvents": [],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "helloworld.helloWorld",
        "title": "Hello World"
      }
    ]
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./"
  },
  "devDependencies": {
    "@types/node": "^8.10.25",
    "@types/vscode": "^1.51.0",
    "tslint": "^5.16.0",
    "typescript": "^3.4.5"
  }
}
Note: If your extension targets a VS Code version prior to 1.74, you must explicitly list onCommand:helloworld.helloWorld in activationEvents.

Extension Entry File
The extension entry file exports two functions, activate and deactivate. activate is executed when your registered Activation Event happens. deactivate gives you a chance to clean up before your extension becomes deactivated. For many extensions, explicit cleanup may not be required, and the deactivate method can be removed. However, if an extension needs to perform an operation when VS Code is shutting down or the extension is disabled or uninstalled, this is the method to do so.

The VS Code extension API is declared in the @types/vscode type definitions. The version of the vscode type definitions is controlled by the value in the engines.vscode field in package.json. The vscode types give you IntelliSense, Go to Definition, and other TypeScript language features in your code.

TypeScript

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "helloworld-sample" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand('helloworld.helloWorld', () => {
    // The code you place here will be executed every time your command is executed

    // Display a message box to the user
    vscode.window.showInformationMessage('Hello World!');
  });

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}