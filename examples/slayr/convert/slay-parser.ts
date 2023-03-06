import { SlayItem } from "../types";

/** Returns a tree of SlayItems from an indented string */
export function parseSlay(data) {
  let res: SlayItem[] = [],
    levels = [res];
  for (let line of data.split("\n")) {
    let level = line.search(/\S/) >> 1, // (index of first non whitespace char) / 2 --> IF indentation is 2 spaces
      root = line.trim(),
      content = [];
    let [tag, text] = root.split(":").map((s) => s.trim());
    text ||= tag;
    if (!root) continue;
    levels[level].push({ tag, text, content });
    levels[++level] = content;
  }
  return res;
}
