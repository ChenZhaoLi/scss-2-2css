const vscode = require("vscode");
const scss = require("sass");

const lodash = require("lodash");
const fs = require("fs");
const path = require("path");
const postcss = require("postcss");
const autoprefixer = require("autoprefixer");
var pxtorem = require("postcss-pxtorem");

const std = vscode.window.createOutputChannel("scss-2-css");

let postcssInstance;
const options = {
  compileOnSave: true,
  autoPrefixer: true,
  autoTransformPx2Rem: true,

  px2RemConfig: {},
  scssConfig: {
    indentType: "space",
    indentWidth: 2,
    outputStyle: "compressed",
  },
  //   outputDir:'',
  //   exclude: "",
  //   workspace: "",
};
function render(file) {
  try {
    return (
      scss.renderSync({
        file,
        ...options.scssConfig,
      }).css + ""
    ).trim();
  } catch (err) {
    std.appendLine(err);
    std.show(true);
  }
}

class Compiler {
  compile(doc) {
    let origin = doc.fileName || "";
    let target = origin.replace(/\.scss$/, "");
    let outputFile = target + ".css";
    // 说明不是 scss 文件
    if (origin === target) {
      return;
    }
    let css = render(origin);
    postcssInstance
      .process(css, { from: "", to: "" })
      .then((result) => {
        fs.writeFileSync(outputFile, result.css);
      })
      .catch((err) => {
        vscode.window.showInformationMessage(err);
      });
  }
  filter(doc) {
    // 未开启保存时编译
    if (!options.compileOnSave) {
      return;
    }
    // let origin = doc.fileName || "";
    // 过滤不编译的文件
    // ...

    // 开始编译
    this.compile(doc);
  }
}

function __init__() {
  postcssInstance = postcss();
  let conf = vscode.workspace.getConfiguration("scss-2-css");
  let folders = vscode.workspace.workspaceFolders;
  // 工作区目录
  let wsDir = "";
  // .scssrc 配置文件
  let configFile = "";
  if (conf) {
    lodash.merge(options, conf);
  }

  if (folders && folders.length) {
    wsDir = folders[0].uri.fsPath;
  }
  if (wsDir) {
    configFile = path.join(wsDir, ".scssrc");
    // options.workspace = wsDir;
  }

  // 有配置文件时, 优先使用配置文件的配置
  if (fs.existsSync(configFile)) {
    let conf = JSON.parse(fs.readFileSync(configFile).toString());
    lodash.merge(options, conf);
  }
  if (options.autoPrefixer) {
    postcssInstance.use(autoprefixer);
  }
  if (options.autoTransformPx2Rem) {
    postcssInstance.use(pxtorem(options.px2RemConfig));
  }
}

function activate(context) {
  __init__();
  const compile = new Compiler();
  vscode.workspace.onDidChangeConfiguration(__init__);
  vscode.workspace.onDidSaveTextDocument((doc) => {
    std.clear();
    compile.filter(doc);
  });

  let cmd = vscode.commands.registerCommand("scss-2-css.compile", () => {
    let editor = vscode.window.activeTextEditor;
    if (editor) {
      compile.filter(editor.document);
    }
  });
  context.subscriptions.push(cmd);
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
