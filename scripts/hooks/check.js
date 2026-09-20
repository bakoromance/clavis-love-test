#!/usr/bin/env node
// Stop 훅 — 답을 마치기 직전에 실제로 대조한다. 안 맞으면 되돌려 다시 쓰게 한다.
//
// 박코 2026-09-20: "한번이면 되는 일 3번하게 하지 말고."
// 규칙을 읽는 것만으로는 안 지켜졌다. 여기서 막아야 지켜진다.
//
// 보는 것 — 박코가 손으로 할 일이 들어간 답인가. 그렇다면
//   · 번호를 매긴 차례가 있는가
//   · 눌러야 할 곳이면 링크(https://)가 있는가
// 둘 중 하나라도 없으면 되돌린다.
//
// AI 를 안 부른다 — 돈이 들지 않는다.
const fs = require("fs");

let 들어온것 = "";
try { 들어온것 = fs.readFileSync(0, "utf8"); } catch { }
let 입력 = {};
try { 입력 = JSON.parse(들어온것 || "{}"); } catch { }

const 통과 = () => { process.stdout.write("{}"); process.exit(0); };

// 이미 한 번 되돌렸으면 또 막지 않는다 — 무한히 맴돌면 안 된다
if (입력.stop_hook_active) 통과();

const 기록 = 입력.transcript_path;
if (!기록 || !fs.existsSync(기록)) 통과();

// 마지막 assistant 글만 본다
let 글 = "";
try {
  const 줄들 = fs.readFileSync(기록, "utf8").split("\n").filter(Boolean);
  for (let i = 줄들.length - 1; i >= 0; i--) {
    let r; try { r = JSON.parse(줄들[i]); } catch { continue; }
    if (r.type !== "assistant") continue;
    const 덩어리 = r.message && r.message.content;
    if (!Array.isArray(덩어리)) continue;
    글 = 덩어리.filter((b) => b.type === "text").map((b) => b.text).join("\n");
    break;
  }
} catch { 통과(); }
if (!글.trim()) 통과();

// 박코가 손으로 해야 하는 일을 시킨 문장을 센다
const 시킴 = /(누르세요|눌러 ?주세요|클릭|더블 ?클릭|붙여넣|넣으세요|입력하세요|실행하세요|열어 ?보세요|접속하세요|가세요|저장을? 누)/g;
const 횟수 = (글.match(시킴) || []).length;
if (횟수 < 2) 통과();                      // 한 가지만 시킨 답은 쪼갠 것이 아니다

const 번호있음 = /(^|\n)\s*(\*\*)?[1１]\s*[.)]/.test(글) || /(^|\n)\s*\*\*\d+단계/.test(글);
const 링크있음 = /https?:\/\/\S+/.test(글);
// 어디를 눌러 들어가라는 말이 있으면 링크가 있어야 한다
const 눌러들어감 = /(접속|열어|사이트|콘솔|설정 ?화면|들어가|페이지)/.test(글);

const 빠진것 = [];
if (!번호있음) 빠진것.push("시킬 일에 번호를 매긴 차례가 없습니다. 1. 2. 3. 으로 전부 적으세요.");
if (눌러들어감 && !링크있음) 빠진것.push("어디로 들어가라면서 누를 링크가 없습니다. 주소를 적으세요.");

if (!빠진것.length) 통과();

process.stdout.write(JSON.stringify({
  decision: "block",
  reason:
    "[보내기 전 대조 ① 에 걸렸습니다 — 박코 규칙]\n" +
    빠진것.map((x) => "- " + x).join("\n") +
    "\n\n박코가 손으로 할 일을 " + 횟수 + "군데 시켰습니다. 그 답 하나로 끝까지 갈 수 있어야 합니다.\n" +
    "할 일을 전부 세고, 번호를 매기고, 단계마다 누를 링크·단추 이름·칸 이름·넣을 값을 적어 다시 쓰세요.\n" +
    "정말 필요 없는 항목이면 왜 필요 없는지 한 줄로 적고 넘어가세요.",
  systemMessage: "보내기 전 대조에 걸려 되돌렸습니다 — " + 빠진것.length + "건",
}));
