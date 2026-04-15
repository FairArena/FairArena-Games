"use client";

import React from "react";
import { GameCard } from "./GameCard";

// ─── CANVAS PREVIEW HELPERS ───────────────────────────────────────────────────

function drawGrid(ctx: CanvasRenderingContext2D, cell = 16) {
  const { width: w, height: h } = ctx.canvas;
  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  ctx.lineWidth = 0.5;
  for (let x = 0; x < w; x += cell) {
    ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke();
  }
  for (let y = 0; y < h; y += cell) {
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke();
  }
}

// ─── GAME DEFINITIONS ─────────────────────────────────────────────────────────

const GAMES = [
  // ── ROW 1: FLAGSHIP GAMES ──
  {
    id: "flappy-hacker",
    href: "/games/flappy-hacker",
    title: "Flappy Hacker",
    tagline: "Dodge PR review gates. Don't let merge conflicts end your run.",
    difficulty: "MEDIUM" as const,
    accentColor: "#7c6af7",
    drawPreview: (ctx: CanvasRenderingContext2D, t: number) => {
      const { width: w, height: h } = ctx.canvas;
      ctx.fillStyle = "#0c0c0e"; ctx.fillRect(0,0,w,h);
      ctx.font = "10px monospace"; ctx.fillStyle = "rgba(124,106,247,0.14)";
      for (let i = 0; i < w; i += 18) {
        ctx.fillText(Math.random()>0.5?"1":"0", i, ((t*0.05+i*3)%h));
      }
      const px = w - ((t*0.07)%(w+60));
      const gy = 70 + Math.sin(t*0.001)*20, gh = 50;
      ctx.fillStyle="#1c1c21"; ctx.strokeStyle="rgba(124,106,247,0.4)"; ctx.lineWidth=1;
      ctx.fillRect(px,0,30,gy); ctx.strokeRect(px,0,30,gy);
      ctx.fillRect(px,gy+gh,30,h-gy-gh); ctx.strokeRect(px,gy+gh,30,h-gy-gh);
      const by = h/2+Math.sin(t*0.003)*15;
      ctx.fillStyle="#ecc94b"; ctx.fillRect(40,by-6,14,12);
      ctx.fillStyle="#0c0c0e"; ctx.fillRect(48,by-3,3,3);
    },
  },
  {
    id: "submission-invaders",
    href: "/games/submission-invaders",
    title: "Submission Invaders",
    tagline: "A SPAM WAVE floods your inbox. Defend the leaderboard.",
    difficulty: "MEDIUM" as const,
    accentColor: "#f56565",
    drawPreview: (ctx: CanvasRenderingContext2D, t: number) => {
      const { width: w, height: h } = ctx.canvas;
      ctx.fillStyle="#0c0c0e"; ctx.fillRect(0,0,w,h);
      for (let i=0;i<30;i++) {
        ctx.fillStyle=`rgba(255,255,255,${0.08+Math.sin(t*0.002+i)*0.04})`;
        ctx.fillRect((i*37+5)%w, (i*23+10)%(h*0.7), 1,1);
      }
      for (let row=0;row<3;row++) for (let col=0;col<6;col++) {
        const x=20+col*42+Math.sin(t*0.001)*10, y=20+row*28;
        const c=row===0?"#f56565":row===1?"#ecc94b":"#3ecf8e";
        ctx.fillStyle=c; ctx.fillRect(x,y,12,10); ctx.fillRect(x+2,y-3,3,3); ctx.fillRect(x+7,y-3,3,3);
      }
      const sx=w/2+Math.sin(t*0.002)*40;
      ctx.fillStyle="#7c6af7"; ctx.fillRect(sx-10,h-25,20,8); ctx.fillRect(sx-4,h-32,8,7);
    },
  },
  {
    id: "deadline-dash",
    href: "/games/deadline-dash",
    title: "Deadline Dash",
    tagline: "90 seconds to demo day. Tap tasks before they crash the floor.",
    difficulty: "MEDIUM" as const,
    accentColor: "#f56565",
    drawPreview: (ctx: CanvasRenderingContext2D, t: number) => {
      const { width: w, height: h } = ctx.canvas;
      ctx.fillStyle="#0c0c0e"; ctx.fillRect(0,0,w,h);
      const tasks = ["Fix CORS","Write README","Deploy!","Add docs","Test mobile"];
      const colors = ["#7c6af7","#3ecf8e","#ecc94b","#f56565","#4db6f4"];
      tasks.forEach((label, i) => {
        const yOff = ((t*0.04+i*40)%(h+60))-20;
        const x = 20 + (i%3)*86;
        ctx.fillStyle="#141421"; ctx.strokeStyle=colors[i]+90; ctx.lineWidth=1;
        ctx.fillRect(x, yOff, 80, 40); ctx.strokeRect(x, yOff, 80, 40);
        ctx.fillStyle=colors[i]; ctx.font="bold 8px monospace"; ctx.textAlign="center";
        ctx.fillText(label, x+40, yOff+16);
        ctx.fillStyle="#1c1c21"; ctx.fillRect(x+8, yOff+24, 64, 6);
        ctx.fillStyle=colors[i]; ctx.fillRect(x+8, yOff+24, 40, 6);
        ctx.textAlign="left";
      });
      // timer bar
      const pct = 0.5+Math.sin(t*0.0005)*0.4;
      ctx.fillStyle="#1c1c21"; ctx.fillRect(0,0,w,5);
      ctx.fillStyle=pct>0.5?"#3ecf8e":"#f56565"; ctx.fillRect(0,0,w*pct,5);
    },
  },
  {
    id: "pitch-perfect",
    href: "/games/pitch-perfect",
    title: "Pitch Perfect",
    tagline: "Simon Says, hackathon edition. Nail the sequence, impress the judges.",
    difficulty: "MEDIUM" as const,
    accentColor: "#ecc94b",
    drawPreview: (ctx: CanvasRenderingContext2D, t: number) => {
      const { width: w, height: h } = ctx.canvas;
      ctx.fillStyle="#0c0c0e"; ctx.fillRect(0,0,w,h);
      const pads = [["#7c6af7","🔥 MVP"],["#3ecf8e","🚀 DEPLOY"],["#ecc94b","💡 IDEA"],["#f56565","🏆 SUBMIT"]];
      pads.forEach(([color, label], i) => {
        const col=i%2, row=Math.floor(i/2);
        const px=col*(w/2)+4, py=row*(h/2)+4, pw=w/2-8, ph=h/2-8;
        const active = Math.floor(t*0.001)%4===i;
        ctx.fillStyle=active?color:color+"40"; ctx.fillRect(px,py,pw,ph);
        ctx.fillStyle=active?"#000":"#e8e8ec"; ctx.font=`bold ${pw<80?10:12}px sans-serif`;
        ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText(label as string, px+pw/2, py+ph/2);
      });
      ctx.textBaseline="alphabetic"; ctx.textAlign="left";
    },
  },
  {
    id: "team-maker",
    href: "/games/team-maker",
    title: "Team Maker",
    tagline: "Match co-founder roles. Build the perfect hackathon team.",
    difficulty: "EASY" as const,
    accentColor: "#3ecf8e",
    drawPreview: (ctx: CanvasRenderingContext2D, t: number) => {
      const { width: w, height: h } = ctx.canvas;
      ctx.fillStyle="#0c0c0e"; ctx.fillRect(0,0,w,h);
      const cards = [
        ["#7c6af7","💻"],["#3ecf8e","🎯"],["#ecc94b","🎨"],["#4db6f4","🤖"],
        ["#f56565","⚡"],["#7c6af7","🐳"],["#3ecf8e","📋"],["#ecc94b","📱"],
      ];
      const cols=4, cardW=(w-20)/cols-4;
      cards.forEach(([color, emoji], i) => {
        const col=i%cols, row=Math.floor(i/cols);
        const cx=10+col*(cardW+4), cy=10+row*((h-20)/2-2);
        const flipped = Math.floor(t*0.0005+i)%3===0;
        ctx.fillStyle=flipped?color+"30":"#141417";
        ctx.strokeStyle=flipped?color:"rgba(255,255,255,0.07)"; ctx.lineWidth=1;
        ctx.fillRect(cx,cy,cardW,(h-20)/2-4); ctx.strokeRect(cx,cy,cardW,(h-20)/2-4);
        if (flipped) {
          ctx.font=`${cardW*0.5}px sans-serif`; ctx.textAlign="center"; ctx.textBaseline="middle";
          ctx.fillText(emoji as string, cx+cardW/2, cy+(h-20)/4-2);
          ctx.textBaseline="alphabetic"; ctx.textAlign="left";
        }
      });
    },
  },
  {
    id: "trivia-blitz",
    href: "/games/trivia-blitz",
    title: "Trivia Blitz",
    tagline: "Test your hackathon IQ. 15 questions, 15 seconds each.",
    difficulty: "EASY" as const,
    accentColor: "#4db6f4",
    drawPreview: (ctx: CanvasRenderingContext2D, t: number) => {
      const { width: w, height: h } = ctx.canvas;
      ctx.fillStyle="#0c0c0e"; ctx.fillRect(0,0,w,h);
      const pct = 0.5+Math.sin(t*0.0008)*0.45;
      ctx.fillStyle="#1c1c21"; ctx.fillRect(16,16,w-32,6);
      ctx.fillStyle=pct>0.5?"#3ecf8e":pct>0.25?"#ecc94b":"#f56565";
      ctx.fillRect(16,16,(w-32)*pct,6);
      ctx.fillStyle="#e8e8ec"; ctx.font="bold 13px sans-serif"; ctx.textAlign="center";
      ctx.fillText("Which platform powers fair judging?", w/2, 50);
      const opts=["Discord","FairArena","Devpost","Notion"];
      opts.forEach((o,i) => {
        const x=16+(i%2)*(w/2-8), y=70+Math.floor(i/2)*38;
        const highlight=i===1 && Math.floor(t*0.001)%4===0;
        ctx.fillStyle=highlight?"#3ecf8e20":"#141417";
        ctx.strokeStyle=highlight?"#3ecf8e":"rgba(255,255,255,0.08)"; ctx.lineWidth=1;
        ctx.fillRect(x,y,w/2-24,32); ctx.strokeRect(x,y,w/2-24,32);
        ctx.fillStyle=highlight?"#3ecf8e":"#e8e8ec"; ctx.font="bold 10px sans-serif";
        ctx.fillText(o, x+8, y+20);
      });
      ctx.textAlign="left";
    },
  },
  // ── ROW 2: ARCADE ──
  {
    id: "hackathon-snake",
    href: "/games/hackathon-snake",
    title: "Hackathon Snake",
    tagline: "Eat the tech stack. Grow your team. Survive scope creep.",
    difficulty: "EASY" as const,
    accentColor: "#3ecf8e",
    drawPreview: (ctx: CanvasRenderingContext2D, t: number) => {
      const { width: w, height: h } = ctx.canvas;
      ctx.fillStyle="#0c0c0e"; ctx.fillRect(0,0,w,h);
      drawGrid(ctx);
      const segs = [[100,80],[84,80],[68,80],[52,80],[52,64],[52,48],[68,48],[84,48]];
      segs.forEach(([x,y],i) => {
        ctx.fillStyle=i===0?"#3ecf8e":`rgba(62,207,142,${0.8-i*0.08})`; ctx.fillRect(x+1,y+1,14,14);
      });
      ctx.font="12px sans-serif"; ctx.fillText("⚛",150+Math.sin(t*0.001)*5,76);
    },
  },
  {
    id: "bug-whacker",
    href: "/games/bug-whacker",
    title: "Bug Whacker",
    tagline: "Click fast. Kill bugs. Save the FairArena demo.",
    difficulty: "EASY" as const,
    accentColor: "#3ecf8e",
    drawPreview: (ctx: CanvasRenderingContext2D, t: number) => {
      const { width: w, height: h } = ctx.canvas;
      ctx.fillStyle="#0c0c0e"; ctx.fillRect(0,0,w,h);
      const cols=4,rows=3, cw=w/cols, ch=h/rows;
      for (let r=0;r<rows;r++) for (let c=0;c<cols;c++) {
        const x=c*cw+4,y=r*ch+4,tw=cw-8,th=ch-8;
        ctx.fillStyle="#141417"; ctx.strokeStyle="rgba(255,255,255,0.07)"; ctx.lineWidth=1;
        ctx.fillRect(x,y,tw,th); ctx.strokeRect(x,y,tw,th);
        ctx.fillStyle="#1c1c21"; ctx.fillRect(x,y,tw,14);
        if ((r*cols+c)%3===0) {
          const pulse=0.5+Math.sin(t*0.005+r*c)*0.5;
          ctx.fillStyle=`rgba(245,101,101,${pulse})`; ctx.font="16px sans-serif";
          ctx.textAlign="center"; ctx.fillText("🐛",x+tw/2,y+th-8); ctx.textAlign="left";
        }
      }
    },
  },
  {
    id: "arena-dash",
    href: "/games/arena-dash",
    title: "Arena Dash",
    tagline: "Endless run through hackathon chaos. Jump scope creep, slide deadlines.",
    difficulty: "MEDIUM" as const,
    accentColor: "#f56565",
    drawPreview: (ctx: CanvasRenderingContext2D, t: number) => {
      const { width: w, height: h } = ctx.canvas;
      ctx.fillStyle="#0c0c0e"; ctx.fillRect(0,0,w,h);
      ctx.fillStyle="#141417";
      [20,40,60,80,100,140,170].forEach((bh,i) => {
        const bx=((i*52-(t*0.04)%w)+w*2)%w;
        ctx.fillRect(bx,h-30-bh,40,bh);
      });
      ctx.fillStyle="#1c1c21"; ctx.fillRect(0,h-30,w,30);
      const py=h-70;
      ctx.fillStyle="#7c6af7"; ctx.fillRect(50,py,16,24);
      ctx.fillStyle="#e8e8ec"; ctx.fillRect(53,py-6,10,8);
      const obX=((250-(t*0.1)%280)+280)%280;
      ctx.fillStyle="#f56565"; ctx.fillRect(obX,h-66,20,36);
    },
  },
  {
    id: "judge-rush",
    href: "/games/judge-rush",
    title: "Judge Rush",
    tagline: "Sort 142 submissions into the right categories. Go.",
    difficulty: "HARD" as const,
    accentColor: "#ecc94b",
    drawPreview: (ctx: CanvasRenderingContext2D, t: number) => {
      const { width: w, height: h } = ctx.canvas;
      ctx.fillStyle="#0c0c0e"; ctx.fillRect(0,0,w,h);
      const cats=["WEB","AI","MOB","BLC","HW"];
      const colors=["#7c6af7","#3ecf8e","#ecc94b","#f56565","#4db6f4"];
      const sw=w/5;
      cats.forEach((cat,i) => {
        ctx.fillStyle=`${colors[i]}20`; ctx.strokeStyle=colors[i]; ctx.lineWidth=1;
        ctx.fillRect(i*sw+2,h-30,sw-4,28); ctx.strokeRect(i*sw+2,h-30,sw-4,28);
        ctx.fillStyle=colors[i]; ctx.font="bold 9px sans-serif"; ctx.textAlign="center";
        ctx.fillText(cat,i*sw+sw/2,h-12); ctx.textAlign="left";
      });
      [{x:50,baseY:30,cat:0},{x:130,baseY:60,cat:2},{x:220,baseY:20,cat:4}].forEach(({x,baseY,cat}) => {
        const y=baseY+((t*0.03)%(h-60));
        ctx.fillStyle=colors[cat]; ctx.fillRect(x-8,y,16,20);
        ctx.fillStyle="#0c0c0e"; ctx.font="6px sans-serif"; ctx.textAlign="center";
        ctx.fillText("PDF",x,y+13); ctx.textAlign="left";
      });
    },
  },
  // ── ROW 3: PUZZLE ──
  {
    id: "score-2048",
    href: "/games/score-2048",
    title: "Score 2048",
    tagline: "Merge 'Idea' into 'Grand Prize'. One swipe at a time.",
    difficulty: "MEDIUM" as const,
    accentColor: "#7c6af7",
    drawPreview: (ctx: CanvasRenderingContext2D, t: number) => {
      const { width: w, height: h } = ctx.canvas;
      ctx.fillStyle="#0c0c0e"; ctx.fillRect(0,0,w,h);
      const tiles=[[2,4,8,2],[16,0,4,8],[0,32,0,4],[2,0,64,0]];
      const tileColors:Record<number,string>={2:"#1c1c21",4:"#252530",8:"#2a2a42",16:"#32326a",32:"#5a4fa0",64:"#7c6af7"};
      const tw=w/4-6,th=h/4-6;
      tiles.forEach((row,r) => row.forEach((val,c) => {
        if (!val) return;
        const x=4+c*(tw+6),y=4+r*(th+6);
        const pulse=val===64?1+Math.sin(t*0.003)*0.03:1;
        ctx.save(); ctx.translate(x+tw/2,y+th/2); ctx.scale(pulse,pulse);
        ctx.fillStyle=tileColors[val]??"#7c6af7"; ctx.fillRect(-tw/2,-th/2,tw,th);
        ctx.fillStyle=val>=8?"#e8e8ec":"#6b6b78";
        ctx.font=`bold 10px monospace`; ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText(String(val),0,0); ctx.restore();
      }));
    },
  },
  {
    id: "stack-wordle",
    href: "/games/stack-wordle",
    title: "Stack Wordle",
    tagline: "Guess today's 5-letter tech word. Daily challenge from the stack.",
    difficulty: "EASY" as const,
    accentColor: "#3ecf8e",
    drawPreview: (ctx: CanvasRenderingContext2D, t: number) => {
      const { width: w, height: h } = ctx.canvas;
      ctx.fillStyle="#0c0c0e"; ctx.fillRect(0,0,w,h);
      const guesses=[
        {word:"FLASK",colors:["#1c1c21","#ecc94b","#1c1c21","#1c1c21","#1c1c21"]},
        {word:"REDUX",colors:["#3ecf8e","#3ecf8e","#1c1c21","#1c1c21","#1c1c21"]},
        {word:"REACT",colors:["#3ecf8e","#3ecf8e","#3ecf8e","#3ecf8e","#3ecf8e"]},
      ];
      const tw=Math.min(34,(w-48)/5),th=30, sx=(w-(tw+4)*5)/2;
      guesses.forEach((g,row) => g.word.split("").forEach((letter,col) => {
        const x=sx+col*(tw+4),y=16+row*(th+4);
        ctx.fillStyle=g.colors[col]; ctx.strokeStyle="rgba(255,255,255,0.1)"; ctx.lineWidth=1;
        ctx.fillRect(x,y,tw,th); ctx.strokeRect(x,y,tw,th);
        ctx.fillStyle="#e8e8ec"; ctx.font=`bold ${th*0.45}px monospace`;
        ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(letter,x+tw/2,y+th/2);
      }));
      for (let row=3;row<6;row++) "REACT".split("").forEach((_,col) => {
        const x=sx+col*(tw+4),y=16+row*(th+4);
        ctx.strokeStyle="rgba(255,255,255,0.06)"; ctx.strokeRect(x,y,tw,th);
      });
      ctx.textBaseline="alphabetic"; ctx.textAlign="left";
    },
  },
  {
    id: "project-blocks",
    href: "/games/project-blocks",
    title: "Project Blocks",
    tagline: "Tetris for builders. Each piece is a feature. Don't stack overflow.",
    difficulty: "MEDIUM" as const,
    accentColor: "#7c6af7",
    drawPreview: (ctx: CanvasRenderingContext2D, t: number) => {
      const { width: w, height: h } = ctx.canvas;
      ctx.fillStyle="#0c0c0e"; ctx.fillRect(0,0,w,h);
      const cw=18,ch=18,cols=10,rows=7,bw=cols*cw,bh=rows*ch,bx=(w-bw)/2,by=h-bh-8;
      ctx.strokeStyle="rgba(255,255,255,0.04)"; ctx.lineWidth=0.5;
      for (let r=0;r<rows;r++) for (let c2=0;c2<cols;c2++) ctx.strokeRect(bx+c2*cw,by+r*ch,cw,ch);
      [[6,"#7c6af7"],[6,"#7c6af7"],[5,"#3ecf8e"],[7,"#3ecf8e"],[4,"#ecc94b"],[5,"#f56565"]].forEach(([col,color],row) => {
        ctx.fillStyle=color as string; ctx.fillRect(bx+(col as number)*cw+1,by+(rows-6+row)*ch+1,cw-2,ch-2);
      });
      const py=Math.floor((t*0.02)%(rows*ch));
      [[4,0],[5,0],[6,0],[5,1]].forEach(([pc,pr]) => {
        ctx.fillStyle="rgba(124,106,247,0.8)"; ctx.fillRect(bx+pc*cw+1,by+Math.min(py,(rows-2)*ch)+pr*ch+1,cw-2,ch-2);
      });
    },
  },
  {
    id: "leaderboard-pong",
    href: "/games/leaderboard-pong",
    title: "Leaderboard Pong",
    tagline: "First to 11 wins the leaderboard. Rubber-band AI. Power-ups.",
    difficulty: "HARD" as const,
    accentColor: "#4db6f4",
    drawPreview: (ctx: CanvasRenderingContext2D, t: number) => {
      const { width: w, height: h } = ctx.canvas;
      ctx.fillStyle="#0c0c0e"; ctx.fillRect(0,0,w,h);
      ctx.setLineDash([4,4]); ctx.strokeStyle="rgba(255,255,255,0.08)"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(w/2,0); ctx.lineTo(w/2,h); ctx.stroke(); ctx.setLineDash([]);
      const p1Y=h/2+Math.sin(t*0.002)*30-20, p2Y=h/2+Math.sin(t*0.002+Math.PI)*30-20;
      ctx.fillStyle="#7c6af7"; ctx.fillRect(12,p1Y,6,40);
      ctx.fillStyle="#f56565"; ctx.fillRect(w-18,p2Y,6,40);
      const bxP=w/2+Math.sin(t*0.003)*(w/2-20), byP=h/2+Math.sin(t*0.004+1)*(h/2-20);
      ctx.fillStyle="#e8e8ec"; ctx.beginPath(); ctx.arc(bxP,byP,4,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#e8e8ec"; ctx.font="bold 20px monospace"; ctx.textAlign="center";
      ctx.fillText("5",w/2-30,28); ctx.fillText("7",w/2+30,28); ctx.textAlign="left";
    },
  },
];

export function GamesGrid() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))",
        gap: "16px",
      }}
    >
      {GAMES.map((game, i) => (
        <GameCard
          key={game.id}
          {...game}
          delay={i * 40}
        />
      ))}
    </div>
  );
}
