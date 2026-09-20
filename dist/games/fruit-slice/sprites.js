const spriteCache = new Map();

function paintFruit(g, fruitKind, cut) {
  const r = 126;
  const leaf = (x, y, scale = 1, angle = 0) => {
    g.save(); g.translate(x, y); g.rotate(angle); g.scale(scale, scale);
    const green = g.createLinearGradient(0, -20, 35, 12); green.addColorStop(0, '#c0ec71'); green.addColorStop(1, '#34834b');
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(15, -35, 49, -15); g.quadraticCurveTo(29, 17, 0, 0); g.fillStyle = green; g.fill();
    g.beginPath(); g.moveTo(3, -1); g.lineTo(38, -13); g.strokeStyle = '#d8f89977'; g.lineWidth = 1.8; g.stroke(); g.restore();
  };
  const stem = (y = -119) => { g.beginPath(); g.moveTo(0, y + 8); g.quadraticCurveTo(-5, y - 10, 10, y - 25); g.strokeStyle = '#826249'; g.lineWidth = 9; g.lineCap = 'round'; g.stroke(); };
  const shape = radius => {
    g.beginPath();
    if (fruitKind === 'apple' && !cut) {
      g.moveTo(0, -radius * .76); g.bezierCurveTo(-radius * .68, -radius * 1.25, -radius * 1.26, -radius * .46, -radius * .93, radius * .3);
      g.bezierCurveTo(-radius * .68, radius * 1.09, -radius * .32, radius * 1.1, 0, radius * .92);
      g.bezierCurveTo(radius * .32, radius * 1.1, radius * .68, radius * 1.09, radius * .93, radius * .3);
      g.bezierCurveTo(radius * 1.26, -radius * .46, radius * .68, -radius * 1.25, 0, -radius * .76);
    } else if (fruitKind === 'strawberry' && !cut) {
      g.moveTo(0, radius * 1.08); g.bezierCurveTo(-radius * .3, radius, -radius * 1.23, -radius * .1, -radius * .89, -radius * .66);
      g.bezierCurveTo(-radius * .6, -radius * 1.06, radius * .6, -radius * 1.06, radius * .89, -radius * .66);
      g.bezierCurveTo(radius * 1.23, -radius * .1, radius * .3, radius, 0, radius * 1.08);
    } else if (fruitKind === 'pear' && !cut) {
      g.moveTo(0, -radius); g.bezierCurveTo(-radius * .5, -radius, -radius * .32, -radius * .4, -radius * .72, -radius * .02);
      g.bezierCurveTo(-radius * 1.35, radius * .85, -radius * .55, radius * 1.12, 0, radius);
      g.bezierCurveTo(radius * .55, radius * 1.12, radius * 1.35, radius * .85, radius * .72, -radius * .02);
      g.bezierCurveTo(radius * .32, -radius * .4, radius * .5, -radius, 0, -radius);
    } else if (fruitKind === 'mango' && !cut) {
      g.moveTo(-radius * .1, -radius); g.bezierCurveTo(radius * .97, -radius * 1.05, radius * 1.2, radius * .05, radius * .55, radius * .8);
      g.bezierCurveTo(-radius * .28, radius * 1.34, -radius * 1.08, radius * .74, -radius * .82, -radius * .2);
      g.quadraticCurveTo(-radius * .66, -radius * .84, -radius * .1, -radius);
    } else {
      const width = { lemon: .87, pineapple: .78, dragonfruit: .86 }[fruitKind] || 1;
      g.ellipse(0, 0, radius * width, radius, 0, cut ? -Math.PI / 2 : 0, cut ? Math.PI / 2 : Math.PI * 2);
    }
    g.closePath();
  };
  const schemes = {
    orange: ['#ffdb73', '#ff9c29', '#d05a10'], lemon: ['#fff89d', '#eed638', '#b8a821'],
    kiwi: ['#cba276', '#96713f', '#5a442c'], apple: ['#ffb08d', '#ef475c', '#a21f43'],
    strawberry: ['#ff9a9d', '#ef4460', '#a42246'],
    pear: ['#eff8a1', '#b8d960', '#659843'], peach: ['#ffe5b5', '#ffb1a1', '#e76a83'],
    pineapple: ['#fff092', '#eab943', '#a87525'], mango: ['#ffed85', '#ffc13d', '#ef7735'],
    dragonfruit: ['#ffb8de', '#ec519a', '#a82370'], blueberry: ['#b5b4ef', '#797bc6', '#3c417e'],
  };
  const colors = schemes[fruitKind];
  if (!cut) {
    shape(r); g.save(); g.clip();
    const gradient = g.createRadialGradient(-40, -48, 0, 26, 30, 174);
    gradient.addColorStop(0, colors[0]); gradient.addColorStop(.42, colors[1]); gradient.addColorStop(1, colors[2]);
    g.fillStyle = gradient; g.fillRect(-150, -150, 300, 300);
    if (fruitKind === 'pineapple') {
      g.lineWidth = 4; g.strokeStyle = '#97682388';
      for (let i = -7; i <= 7; i++) for (const sign of [-1, 1]) {
        g.beginPath(); g.moveTo(-150, i * 34 - sign * 150); g.lineTo(150, i * 34 + sign * 150); g.stroke();
      }
      for (let y = -102; y < 125; y += 34) for (let x = -102; x <= 102; x += 34) {
        g.beginPath(); g.arc(x + ((y + 102) / 34 % 2) * 17, y, 3, 0, 7); g.fillStyle = '#fff4a9bb'; g.fill();
      }
    } else if (fruitKind === 'dragonfruit') {
      for (let row = 0; row < 4; row++) for (let col = -1; col <= 1; col++) {
        const x = col * 53 + (row % 2 ? 20 : -5), y = -75 + row * 48;
        g.beginPath(); g.moveTo(x - 17, y + 21); g.quadraticCurveTo(x, y + 10, x + 8, y - 20); g.quadraticCurveTo(x + 24, y + 20, x - 17, y + 21);
        g.fillStyle = '#ffc5df'; g.fill(); g.beginPath(); g.moveTo(x + 3, y - 7); g.lineTo(x + 8, y - 20); g.lineTo(x + 14, y - 1); g.fillStyle = '#c4eb83'; g.fill();
      }
    } else if (fruitKind === 'strawberry') {
      for (let row = 0; row < 7; row++) {
        const y = -79 + row * 26, span = 90 * (1 - Math.max(0, row - 1) * .13);
        for (let i = 0; i < 5; i++) {
          const x = (i - 2) * span / 2 + (row % 2 ? 8 : 0);
          g.beginPath(); g.ellipse(x, y, 3.2, 5.7, -x / 180, 0, 7); g.fillStyle = '#8a273577'; g.fill();
          g.beginPath(); g.ellipse(x - 1, y - 1, 2.1, 4.1, -x / 180, 0, 7); g.fillStyle = '#ffefa0'; g.fill();
        }
      }
    } else {
      for (let i = 0; i < 350; i++) {
        const x = Math.sin(i * 127.1) * r, y = Math.cos(i * 83.7) * r;
        if (fruitKind === 'kiwi') { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 3, y - 4); g.strokeStyle = i % 2 ? '#f3d7a455' : '#42342055'; g.lineWidth = 1; g.stroke(); }
        else { g.beginPath(); g.arc(x, y, fruitKind === 'apple' ? 1.1 : 1.8, 0, 7); g.fillStyle = i % 3 ? '#ffffd22e' : '#8d3a2022'; g.fill(); }
      }
    }
    const gloss = g.createRadialGradient(-46, -57, 0, -32, -43, 73); gloss.addColorStop(0, '#fffce44d'); gloss.addColorStop(1, '#fffce400'); g.fillStyle = gloss; g.fillRect(-r, -r, r * 2, r * 2);
    if (fruitKind === 'peach') {
      g.beginPath(); g.moveTo(5, -115); g.bezierCurveTo(-38, -53, 39, 50, 3, 123); g.lineWidth = 5; g.strokeStyle = '#d66b7977'; g.stroke();
    }
    if (fruitKind === 'blueberry') {
      g.save(); g.translate(10, -64); g.rotate(.2); g.beginPath();
      for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, radius = i % 2 ? 14 : 29; i ? g.lineTo(Math.cos(a) * radius, Math.sin(a) * radius) : g.moveTo(Math.cos(a) * radius, Math.sin(a) * radius); }
      g.closePath(); g.fillStyle = '#414b8b'; g.fill(); g.strokeStyle = '#c6c8ff99'; g.lineWidth = 4; g.stroke(); g.restore();
    }
    g.restore();
    if (fruitKind === 'apple') { stem(-100); leaf(1, -108, 1.1, -.12); }
    else if (fruitKind === 'orange') { stem(-119); leaf(0, -123, .95, .1); }
    else if (fruitKind === 'lemon') { g.fillStyle = '#e6cd39'; for (const y of [-125, 123]) { g.beginPath(); g.ellipse(0, y, 12, 10, 0, 0, 7); g.fill(); } leaf(-2, -123, .9, -.2); }
    else if (fruitKind === 'strawberry') {
      for (let i = 0; i < 5; i++) leaf(0, -94, 1.08, -Math.PI + i * .68);
      stem(-104);
    } else if (fruitKind === 'pineapple') {
      for (let i = -2; i <= 2; i++) {
        g.beginPath(); g.moveTo(0, -97); g.quadraticCurveTo(i * 15, -132, i * 26, -154 + Math.abs(i) * 8); g.quadraticCurveTo(i * 27 + 14, -109, 0, -97);
        g.fillStyle = i % 2 ? '#72b361' : '#43875b'; g.fill();
      }
    } else if (['pear', 'peach', 'mango'].includes(fruitKind)) {
      stem(-116); leaf(0, -124, .95, -.15);
    } else if (fruitKind === 'dragonfruit') {
      for (let i = -1; i <= 1; i++) leaf(i * 10, -112, .65, -1.8 + i * .7);
    } else if (fruitKind !== 'blueberry') {
      g.beginPath(); g.ellipse(0, -116, 15, 7, 0, 0, 7); g.fillStyle = '#705332'; g.fill();
    }
    return;
  }
  shape(r); g.fillStyle = colors[1]; g.fill();
  shape(r - 7); g.fillStyle = fruitKind === 'kiwi' ? '#cbdf89' : '#fff2b4'; g.fill();
  shape(r - 13);
  const inside = {
    orange: ['#ffd16a', '#f89126'], lemon: ['#fff7b0', '#e9d85a'], kiwi: ['#dcf07b', '#86bf3a'],
    apple: ['#fff5d2', '#ffe6b5'], strawberry: ['#ffb4b5', '#f0607e'], pear: ['#fffbe1', '#eaf0bb'],
    peach: ['#ffdf9f', '#ffb477'], pineapple: ['#fff3a0', '#ecc84d'], mango: ['#ffdf62', '#ffa42e'],
    dragonfruit: ['#fffafc', '#f8dfef'], blueberry: ['#e0d9fc', '#aaa0da'],
  }[fruitKind];
  const gradient = g.createLinearGradient(0, -r, r, r); gradient.addColorStop(0, inside[0]); gradient.addColorStop(1, inside[1]); g.fillStyle = gradient; g.fill();
  g.save(); shape(r - 14); g.clip();
  if (fruitKind === 'orange' || fruitKind === 'lemon') {
    for (let i = 0; i <= 5; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * (r - 11), Math.sin(a) * (r - 11)); g.strokeStyle = '#fff1b8cc'; g.lineWidth = 4; g.stroke();
      for (let j = 0; j < 4; j++) {
        const ray = a + .12 + j * .12;
        g.beginPath(); g.moveTo(Math.cos(ray) * 25, Math.sin(ray) * 25); g.lineTo(Math.cos(ray) * 98, Math.sin(ray) * 98); g.strokeStyle = '#fff9c744'; g.lineWidth = 2; g.stroke();
      }
    }
    g.beginPath(); g.arc(0, 0, 13, 0, 7); g.fillStyle = '#fff4c7'; g.fill();
  } else if (fruitKind === 'kiwi') {
    for (let i = 0; i < 28; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 27;
      g.beginPath(); g.moveTo(Math.cos(a) * 25, Math.sin(a) * 38); g.lineTo(Math.cos(a) * 109, Math.sin(a) * 109); g.strokeStyle = i % 2 ? '#f0fdb459' : '#5c9c2659'; g.lineWidth = 2; g.stroke();
      if (i % 2) { g.save(); g.translate(Math.cos(a) * 66, Math.sin(a) * 70); g.rotate(a); g.beginPath(); g.ellipse(0, 0, 4, 2.5, 0, 0, 7); g.fillStyle = '#353b2a'; g.fill(); g.restore(); }
    }
    g.beginPath(); g.ellipse(0, 0, 28, 42, 0, 0, 7); g.fillStyle = '#f7f4c1'; g.fill();
  } else if (fruitKind === 'apple' || fruitKind === 'pear') {
    g.beginPath(); g.ellipse(0, 0, 33, 62, 0, 0, 7); g.fillStyle = '#eed69c'; g.fill();
    for (const y of [-27, 27]) { g.beginPath(); g.ellipse(17, y, 5, 10, -.2, 0, 7); g.fillStyle = '#704731'; g.fill(); }
    g.beginPath(); g.moveTo(0, -110); g.lineTo(0, 110); g.strokeStyle = '#dfc88e'; g.lineWidth = 3; g.stroke();
  } else if (fruitKind === 'peach' || fruitKind === 'mango') {
    g.beginPath(); g.ellipse(4, 0, fruitKind === 'mango' ? 33 : 42, 65, -.12, 0, 7); g.fillStyle = fruitKind === 'mango' ? '#f7d477' : '#9e5141'; g.fill();
    g.strokeStyle = fruitKind === 'mango' ? '#e9b343' : '#d98359'; g.lineWidth = 3;
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 10, -49); g.quadraticCurveTo(i * 16 + 8, 0, i * 9, 49); g.stroke(); }
  } else if (fruitKind === 'dragonfruit') {
    for (let i = 0; i < 55; i++) {
      const x = 9 + ((i * 37) % 90), y = -108 + ((i * 53) % 216);
      g.beginPath(); g.ellipse(x, y, 2.4, 3.5, i, 0, 7); g.fillStyle = '#473745'; g.fill();
    }
  } else if (fruitKind === 'pineapple' || fruitKind === 'blueberry') {
    g.strokeStyle = fruitKind === 'pineapple' ? '#fff9c3bb' : '#7b6eac99'; g.lineWidth = 3;
    for (let i = 0; i < 12; i++) { const a = -Math.PI / 2 + i * Math.PI / 11; g.beginPath(); g.moveTo(Math.cos(a) * 24, Math.sin(a) * 24); g.lineTo(Math.cos(a) * 106, Math.sin(a) * 106); g.stroke(); }
    g.beginPath(); g.ellipse(0, 0, 25, fruitKind === 'pineapple' ? 45 : 27, 0, 0, 7); g.fillStyle = fruitKind === 'pineapple' ? '#fff9cf' : '#eee4ff'; g.fill();
  } else {
    g.beginPath(); g.moveTo(0, -103); g.quadraticCurveTo(55, -22, 0, 100); g.fillStyle = '#ffd4ca'; g.fill();
    for (let i = 0; i < 12; i++) { const a = -1.35 + i / 11 * 2.7; g.beginPath(); g.ellipse(Math.cos(a) * 104, Math.sin(a) * 104, 2.8, 4, -a, 0, 7); g.fillStyle = '#ffeeb5'; g.fill(); }
  }
  g.restore();
}
function paintVictoryFruit(g) {
  const gradient = g.createRadialGradient(-40, -49, 3, 25, 24, 163);
  gradient.addColorStop(0, '#fff7b0'); gradient.addColorStop(.4, '#ffd562'); gradient.addColorStop(1, '#d88526');
  g.beginPath(); g.moveTo(0, -113); g.bezierCurveTo(-151, -155, -163, 100, -25, 121); g.quadraticCurveTo(0, 136, 26, 121); g.bezierCurveTo(163, 100, 151, -155, 0, -113);
  g.fillStyle = gradient; g.fill(); g.strokeStyle = '#fff0a0'; g.lineWidth = 3; g.stroke();
  g.save(); g.clip();
  for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 12, -117); g.bezierCurveTo(i * 65, -47, i * 66, 54, i * 13, 125); g.strokeStyle = '#ac64292c'; g.lineWidth = 5; g.stroke(); }
  g.restore();
  g.beginPath(); g.moveTo(-35, -109); g.lineTo(-43, -148); g.lineTo(-16, -129); g.lineTo(0, -157); g.lineTo(17, -129); g.lineTo(43, -148); g.lineTo(35, -109); g.closePath();
  g.fillStyle = '#ffdf70'; g.fill(); g.strokeStyle = '#fff4b1'; g.lineWidth = 4; g.stroke();
  g.beginPath(); g.ellipse(0, 9, 61, 70, 0, 0, 7); g.fillStyle = '#a9533199'; g.fill();
  g.beginPath(); g.ellipse(0, 6, 56, 65, 0, 0, 7); g.fillStyle = '#fff0b4'; g.fill();
  for (let row = -2; row <= 2; row++) for (let col = -1; col <= 1; col++) {
    const x = col * 26 + (row % 2 ? 9 : 0), y = row * 22 + 5;
    g.beginPath(); g.ellipse(x, y, 9, 11, -.18, 0, 7); g.fillStyle = row % 2 ? '#ed7958' : '#df5654'; g.fill();
    g.beginPath(); g.ellipse(x - 2, y - 4, 3, 4, -.18, 0, 7); g.fillStyle = '#ffd6a4'; g.fill();
  }
}
export function makeSprite(kind, fruitKind = 'watermelon', variety = 0) {
  const key = `${kind}-${fruitKind}-${variety}`;
  if (spriteCache.has(key)) return spriteCache.get(key);
  const surface = document.createElement('canvas'); surface.width = surface.height = 320;
  const g = surface.getContext('2d'); g.translate(160, 160);
  const r = 126;
  if (fruitKind === 'victory' && kind !== 'bomb') {
    paintVictoryFruit(g); spriteCache.set(key, surface); return surface;
  }
  if (kind !== 'bomb' && fruitKind !== 'watermelon') {
    paintFruit(g, fruitKind, kind === 'half'); spriteCache.set(key, surface); return surface;
  }
  if (kind === 'whole') {
    g.save(); g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.clip();
    let gradient = g.createRadialGradient(-46, -56, 4, 24, 34, r * 1.4);
    gradient.addColorStop(0, variety ? '#b5d663' : '#a5d06a'); gradient.addColorStop(.43, variety ? '#789d36' : '#4e9b42'); gradient.addColorStop(1, '#103e2e');
    g.fillStyle = gradient; g.fillRect(-r, -r, r * 2, r * 2);
    for (let i = -4; i <= 4; i++) {
      g.beginPath();
      for (let j = 0; j <= 35; j++) {
        const y = -r + j / 35 * r * 2;
        const curve = Math.sqrt(Math.max(0, 1 - (y / r) ** 2));
        const x = i * 31 * curve + Math.sin(j * .94 + i) * (3 + curve * 2) + 9 * Math.sin(y / r * 2);
        j ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.strokeStyle = i % 2 ? '#1b632f99' : '#174c2c99'; g.lineWidth = 12 + (4 - Math.abs(i)) * 2; g.stroke();
    }
    gradient = g.createRadialGradient(-47, -59, 0, -29, -44, 112); gradient.addColorStop(0, '#ffffba55'); gradient.addColorStop(.6, '#d6ffaa0a'); gradient.addColorStop(1, '#00000000'); g.fillStyle = gradient; g.fillRect(-r, -r, r * 2, r * 2);
    // Fine rind freckles are painted once, then reused for every frame.
    for (let i = 0; i < 160; i++) {
      const x = Math.sin(i * 113.2) * r, y = Math.cos(i * 57.9) * r;
      g.fillStyle = '#efffb319'; g.beginPath(); g.arc(x, y, .8 + (i % 3) * .3, 0, 7); g.fill();
    }
    g.restore();
    g.beginPath(); g.moveTo(-1, -r + 7); g.quadraticCurveTo(-13, -r - 8, 1, -r - 17); g.strokeStyle = '#b6c677'; g.lineWidth = 7; g.lineCap = 'round'; g.stroke();
    g.beginPath(); g.moveTo(0, -r - 6); g.quadraticCurveTo(24, -r - 32, 35, -r - 7); g.quadraticCurveTo(17, -r + 7, 0, -r - 6); g.fillStyle = '#9bd35c'; g.fill();
  } else if (kind === 'half') {
    function semi(radius) { g.beginPath(); g.arc(0, 0, radius, -Math.PI / 2, Math.PI / 2); g.closePath(); }
    semi(r); g.fillStyle = '#35924b'; g.fill();
    semi(r - 7); g.fillStyle = '#dcf8a6'; g.fill();
    semi(r - 15);
    const gradient = g.createLinearGradient(0, -r, r, r); gradient.addColorStop(0, '#ff9b9d'); gradient.addColorStop(.45, '#fa5970'); gradient.addColorStop(1, '#cf2e54'); g.fillStyle = gradient; g.fill();
    g.save(); semi(r - 16); g.clip();
    g.strokeStyle = '#ffb5b233'; g.lineWidth = 2;
    for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(3, 0, 24 + i * 13, -1.5, 1.5); g.stroke(); }
    for (let row = 0; row < 3; row++) {
      const ring = 34 + row * 27;
      for (let i = 0; i < 3 + row; i++) {
        const angle = -1.17 + i / (2 + row) * 2.34;
        const x = Math.cos(angle) * ring, y = Math.sin(angle) * ring;
        g.save(); g.translate(x, y); g.rotate(angle); g.beginPath(); g.ellipse(0, 0, 5, 2.8, 0, 0, 7); g.fillStyle = '#502c38'; g.fill(); g.beginPath(); g.ellipse(-1, -1, 2.2, .8, 0, 0, 7); g.fillStyle = '#ba7882'; g.fill(); g.restore();
      }
    }
    g.restore();
    g.beginPath(); g.moveTo(0, -r + 15); g.lineTo(0, r - 15); g.strokeStyle = '#ffa6a9'; g.lineWidth = 3; g.stroke();
  } else {
    const gradient = g.createRadialGradient(-40, -45, 0, 22, 33, 150); gradient.addColorStop(0, '#899690'); gradient.addColorStop(.22, '#485651'); gradient.addColorStop(.7, '#17231f'); gradient.addColorStop(1, '#08110e');
    g.beginPath(); g.arc(0, 0, r, 0, 7); g.fillStyle = gradient; g.fill(); g.strokeStyle = '#93a09055'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#e4e8c8'; g.font = 'bold 93px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('×', 0, 4);
    g.fillStyle = '#5e6b57'; g.fillRect(-19, -r - 11, 38, 24);
    g.beginPath(); g.moveTo(0, -r - 9); g.quadraticCurveTo(5, -r - 32, 32, -r - 25); g.lineWidth = 6; g.strokeStyle = '#d6c99a'; g.stroke();
  }
  spriteCache.set(key, surface); return surface;
}
