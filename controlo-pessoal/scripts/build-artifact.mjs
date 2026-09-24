// Converte dist-artifact/index.html no formato de página de artifact:
// sem <!doctype>/<html>/<head>/<body> (a plataforma acrescenta-os).
import { readFileSync, writeFileSync } from "node:fs";

const html = readFileSync("dist-artifact/index.html", "utf8");
const head = html.match(/<head>([\s\S]*)<\/head>/)[1];
const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
const title = head.match(/<title>[\s\S]*?<\/title>/)[0];
const styles = head.match(/<style[\s\S]*?<\/style>/g) || [];
const scripts = head.match(/<script[\s\S]*?<\/script>/g) || [];

writeFileSync(
  "dist-artifact/controlo-pessoal.html",
  [title, ...styles, body.trim(), ...scripts].join("\n") + "\n"
);
