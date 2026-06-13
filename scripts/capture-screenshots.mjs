import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');
const IMAGES_DIR = join(PUBLIC_DIR, 'images');

const projects = [
  {
    id: 1,
    title: 'CFO-RetinaNet: Convolutional Feature Optimization',
    url: 'https://eprints.uad.ac.id/84763/1/9-CFO-RetinaNet%20Convolutional%20Feature%20Optimization%20for%20Oil%20Palm%20Ripeness%20Assessment%20in%20Precision%20Agriculture.pdf',
    file: 'cfo-retinanet.jpg',
    ssl: false,
  },
  {
    id: 2,
    title: 'Brain Tumor Detection & Classification',
    url: 'https://ijicom.respati.ac.id/index.php/ijicom/article/view/80',
    file: 'brain-tumor.jpg',
    ssl: false,
  },
  {
    id: 3,
    title: 'Home Server Infrastructure',
    url: 'https://alkamfrz.my.id',
    file: 'homelab-rack.jpg',
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
      await page.screenshot({ path: outputPath, fullPage: false });
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
