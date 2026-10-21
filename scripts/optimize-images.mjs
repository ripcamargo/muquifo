// Gera as versões otimizadas das imagens a partir dos originais em assets-src/.
// Uso: npm run images  (só é necessário rodar novamente se trocar os originais)
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const SRC = 'assets-src';
const OUT = 'public/img';
const ICONS = 'public';

// Cores medidas no arquivo original do logo.
const LOGO_BG = [110, 22, 47]; // #6E162F
const LOGO_INK = [236, 231, 211]; // #ECE7D3

await mkdir(OUT, { recursive: true });

/** Fotos: várias larguras em WebP + um JPEG de fallback. */
async function photo(name, widths = [640, 960, 1195]) {
  for (const w of widths) {
    await sharp(`${SRC}/${name}.jpg`).resize({ width: w }).webp({ quality: 78 }).toFile(`${OUT}/${name}-${w}.webp`);
  }
  await sharp(`${SRC}/${name}.jpg`).resize({ width: 1195 }).jpeg({ quality: 80, mozjpeg: true }).toFile(`${OUT}/${name}.jpg`);
}

/**
 * Remove o fundo bordô do logo sem redesenhá-lo: como a arte tem só duas cores,
 * a opacidade de cada pixel é a posição dele no segmento fundo → creme.
 */
async function transparentLogo(region, file, height) {
  const { data, info } = await sharp(`${SRC}/logo.jpg`).extract(region).raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  const d = LOGO_INK.map((v, i) => v - LOGO_BG[i]);
  const len2 = d.reduce((s, v) => s + v * v, 0);
  for (let p = 0; p < info.width * info.height; p++) {
    let t = 0;
    for (let c = 0; c < 3; c++) t += (data[p * 3 + c] - LOGO_BG[c]) * d[c];
    let a = t / len2;
    a = a < 0.06 ? 0 : a > 0.94 ? 1 : a;
    out[p * 4] = LOGO_INK[0];
    out[p * 4 + 1] = LOGO_INK[1];
    out[p * 4 + 2] = LOGO_INK[2];
    out[p * 4 + 3] = Math.round(a * 255);
  }
  const img = sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } });
  await img.clone().resize({ height }).png({ compressionLevel: 9 }).toFile(`${OUT}/${file}.png`);
  await img.clone().resize({ height }).webp({ quality: 90, alphaQuality: 100 }).toFile(`${OUT}/${file}.webp`);
}

await photo('studio-bateria');
await photo('studio-guitarra');

// Marca com as barras (sem "HOME STUDIO"), para o cabeçalho.
await transparentLogo({ left: 105, top: 343, width: 814, height: 246 }, 'logo-wordmark', 160);
// Assinatura completa (marca + "HOME STUDIO"), para hero e rodapé.
await transparentLogo({ left: 105, top: 343, width: 814, height: 338 }, 'logo-lockup', 400);

// Logo original (quadrado), sem alterações além do tamanho.
await sharp(`${SRC}/logo.jpg`).resize(512).webp({ quality: 88 }).toFile(`${OUT}/logo-square-512.webp`);

// Ícones e Open Graph.
await sharp(`${SRC}/logo.jpg`).resize(180).png().toFile(`${ICONS}/apple-touch-icon.png`);
await sharp(`${SRC}/logo.jpg`).resize(192).png().toFile(`${ICONS}/icon-192.png`);
await sharp(`${SRC}/logo.jpg`).resize(512).png().toFile(`${ICONS}/icon-512.png`);
await sharp(`${SRC}/logo.jpg`)
  .extract({ left: 97, top: 97, width: 830, height: 830 })
  .resize(48)
  .png()
  .toFile(`${ICONS}/favicon-48.png`);
await sharp(`${SRC}/logo.jpg`)
  .extract({ left: 0, top: 243, width: 1024, height: 538 })
  .resize(1200, 630)
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(`${ICONS}/og-image.jpg`);

console.log('Imagens geradas em', OUT);
