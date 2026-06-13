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
    url: 'https://paperity.org/p/365908143/cfo-retinanet-convolutional-feature-optimization-for-oil-palm-ripeness-assessment-in',
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
    {
      id: 4,
      title: 'Monitoring Stack',
      url: 'https://grafana.alkamfrz.my.id',
      file: 'grafana-dashboard.jpg',
      ssl: true,
      note: 'SSL SNI mismatch: run this script inside your home network, or replace with a manual screenshot',
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
