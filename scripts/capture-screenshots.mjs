import { chromium } from 'playwright';
import { mkdirSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');
const IMAGES_DIR = join(PUBLIC_DIR, 'images');

const projects = [
  {
    id: 1,
    title: 'CFO-RetinaNet: Convolutional Feature Optimization',
    url: 'https://garuda.kemdiktisaintek.go.id/documents/detail/5253843',
    file: 'cfo-retinanet.webp',
    ssl: false,
  },
  {
    id: 2,
    title: 'Brain Tumor Detection & Classification',
    url: 'https://ijicom.respati.ac.id/index.php/ijicom/article/view/80',
    file: 'brain-tumor.webp',
    ssl: false,
  },
  {
    id: 3,
    title: 'Home Server Infrastructure',
    url: 'https://alkamfrz.id',
    file: 'homelab-rack.webp',
    ssl: false,
  },
];

async function capture() {
  if (!existsSync(IMAGES_DIR)) {
    mkdirSync(IMAGES_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    ignoreHTTPSErrors: true,
  });

  for (const project of projects) {
    const outputPath = join(IMAGES_DIR, project.file);
    console.log(`[${project.id}/${projects.length}] ${project.title} -> ${project.file}`);

    try {
      const page = await context.newPage();
      await page.goto(project.url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1500);
      
      // Capture a JPEG screenshot in memory
      const jpegBuffer = await page.screenshot({ type: 'jpeg', quality: 90 });
      
      // Convert it to WebP inside the browser context using canvas
      const webpDataUrl = await page.evaluate(async (jpegBase64) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/webp', 0.85));
          };
          img.src = 'data:image/jpeg;base64,' + jpegBase64;
        });
      }, jpegBuffer.toString('base64'));

      // Convert base64 data URL back to binary buffer and write
      const base64Data = webpDataUrl.split(',')[1];
      const webpBuffer = Buffer.from(base64Data, 'base64');
      writeFileSync(outputPath, webpBuffer);
      
      await page.close();
      console.log(`  OK: ${outputPath}`);
    } catch (err) {
      console.log(`  FAIL: ${err.message}`);
    }
  }

  await browser.close();
  console.log('\nDone.');
}

capture();
