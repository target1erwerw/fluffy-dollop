import 'dotenv/config';
import puppeteer from 'puppeteer';
import { SkyTrustClient } from './skytrust-client.js';

const client = new SkyTrustClient({
  apiKey: process.env.SKYTRUST_API_KEY,
  baseUrl: process.env.SKYTRUST_BASE_URL || 'https://skytrust.space',
});

/**
 * Ví dụ khung Puppeteer cho hệ thống/trang mà bạn được phép tự động hóa.
 * Thay URL và selector bằng giao diện nội bộ hoặc luồng kiểm thử hợp pháp của bạn.
 */
async function runAuthorizedFlow() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox'],
  });

  try {
    const page = await browser.newPage();
    const phone = await client.pickPhone({ prefix: '84' });

    const output = await client.withAllocation(
      {
        number: phone.number,
        senders: ['google'],
        keywords: ['code', 'otp'],
        ttlSeconds: 180,
      },
      async (allocation) => {
        // Chỉ dùng với hệ thống bạn sở hữu hoặc được cho phép kiểm thử.
        await page.goto('https://example.com/your-authorized-test-page', {
          waitUntil: 'domcontentloaded',
        });

        // Ví dụ:
        // await page.type('#phone', phone.number);
        // await page.click('#send-code');

        const { code, sms } = await client.waitForCode({
          allocationId: allocation.allocation_id,
          totalTimeoutSeconds: 180,
          pollTimeoutSeconds: 60,
          since: allocation.created_at,
        });

        // Ví dụ:
        // await page.type('#otp', code);
        // await page.click('#verify');

        return {
          number: phone.number,
          allocationId: allocation.allocation_id,
          code,
          sender: sms.sender,
        };
      },
    );

    console.log(output);
  } finally {
    await browser.close();
  }
}

runAuthorizedFlow().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
