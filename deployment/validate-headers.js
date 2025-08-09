#!/usr/bin/env node

/**
 * Security Headers Validation Tool
 * 驗證部署後的安全 Headers 是否正確配置
 * 
 * Usage: node validate-headers.js <URL>
 * Example: node validate-headers.js https://your-domain.com
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 必要的安全 Headers 配置
const REQUIRED_HEADERS = {
  'content-security-policy': {
    name: 'Content-Security-Policy',
    description: '內容安全政策 - 防止 XSS 攻擊',
    required: true,
    validate: (value) => {
      const requiredDirectives = ['default-src', 'script-src', 'style-src'];
      return requiredDirectives.every(directive => 
        value.toLowerCase().includes(directive)
      );
    }
  },
  'strict-transport-security': {
    name: 'Strict-Transport-Security',
    description: 'HTTP 嚴格傳輸安全 - 強制 HTTPS',
    required: true,
    validate: (value) => {
      return value.includes('max-age=') && parseInt(value.match(/max-age=(\d+)/)?.[1] || '0') >= 31536000;
    }
  },
  'x-frame-options': {
    name: 'X-Frame-Options',
    description: '防止點擊劫持攻擊',
    required: true,
    validate: (value) => {
      return ['DENY', 'SAMEORIGIN'].includes(value.toUpperCase());
    }
  },
  'x-content-type-options': {
    name: 'X-Content-Type-Options',
    description: '防止 MIME 類型混淆攻擊',
    required: true,
    validate: (value) => {
      return value.toLowerCase() === 'nosniff';
    }
  },
  'referrer-policy': {
    name: 'Referrer-Policy',
    description: '控制 Referrer 資訊洩露',
    required: true,
    validate: (value) => {
      const validPolicies = [
        'no-referrer',
        'no-referrer-when-downgrade',
        'origin',
        'origin-when-cross-origin',
        'same-origin',
        'strict-origin',
        'strict-origin-when-cross-origin',
        'unsafe-url'
      ];
      return validPolicies.includes(value.toLowerCase());
    }
  },
  'permissions-policy': {
    name: 'Permissions-Policy',
    description: '限制瀏覽器功能權限',
    required: false,
    validate: (value) => {
      return value.includes('geolocation=') || value.includes('microphone=') || value.includes('camera=');
    }
  }
};

// 顏色輸出函數
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

// HTTP 請求函數
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'HEAD',
      headers: {
        'User-Agent': 'DB-Card Security Headers Validator/1.0'
      }
    };

    const req = client.request(options, (res) => {
      resolve({
        statusCode: res.statusCode,
        headers: res.headers
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

// 驗證單個 Header
function validateHeader(headerName, headerValue, config) {
  const result = {
    name: config.name,
    description: config.description,
    present: !!headerValue,
    valid: false,
    value: headerValue || 'Not present',
    issues: []
  };

  if (!headerValue) {
    if (config.required) {
      result.issues.push('Header 缺失');
    }
    return result;
  }

  if (config.validate) {
    result.valid = config.validate(headerValue);
    if (!result.valid) {
      result.issues.push('Header 值不符合安全要求');
    }
  } else {
    result.valid = true;
  }

  return result;
}

// 生成報告
function generateReport(url, results, responseInfo) {
  console.log(colors.bold('\n🔒 DB-Card 安全 Headers 驗證報告'));
  console.log('='.repeat(60));
  console.log(`📍 檢測 URL: ${colors.blue(url)}`);
  console.log(`📊 HTTP 狀態: ${responseInfo.statusCode}`);
  console.log(`⏰ 檢測時間: ${new Date().toLocaleString('zh-TW')}`);
  console.log('='.repeat(60));

  let passCount = 0;
  let totalRequired = 0;
  let totalOptional = 0;

  Object.entries(results).forEach(([headerName, result]) => {
    const config = REQUIRED_HEADERS[headerName];
    const status = result.present && result.valid ? '✅' : 
                   result.present && !result.valid ? '⚠️' : '❌';
    
    console.log(`\n${status} ${colors.bold(result.name)}`);
    console.log(`   ${result.description}`);
    console.log(`   值: ${colors.yellow(result.value)}`);
    
    if (result.issues.length > 0) {
      result.issues.forEach(issue => {
        console.log(`   ${colors.red('⚠️ ' + issue)}`);
      });
    }

    if (config.required) {
      totalRequired++;
      if (result.present && result.valid) passCount++;
    } else {
      totalOptional++;
    }
  });

  // 總結
  console.log('\n' + '='.repeat(60));
  console.log(colors.bold('📋 驗證總結'));
  console.log(`必要 Headers: ${colors.green(passCount)}/${totalRequired} 通過`);
  console.log(`選用 Headers: ${Object.keys(results).length - totalRequired} 個檢測`);
  
  const score = totalRequired > 0 ? Math.round((passCount / totalRequired) * 100) : 0;
  const scoreColor = score >= 90 ? colors.green : score >= 70 ? colors.yellow : colors.red;
  console.log(`安全評分: ${scoreColor(score + '%')}`);

  // 建議
  console.log('\n' + colors.bold('💡 改善建議:'));
  Object.entries(results).forEach(([headerName, result]) => {
    if (!result.present && REQUIRED_HEADERS[headerName].required) {
      console.log(`   • 添加 ${result.name} Header`);
    } else if (result.present && !result.valid) {
      console.log(`   • 修正 ${result.name} Header 配置`);
    }
  });

  return score >= 90;
}

// 主函數
async function main() {
  const url = process.argv[2];
  
  if (!url) {
    console.error(colors.red('❌ 請提供要檢測的 URL'));
    console.log('使用方式: node validate-headers.js <URL>');
    console.log('範例: node validate-headers.js https://your-domain.com');
    process.exit(1);
  }

  try {
    console.log(colors.blue('🔍 正在檢測安全 Headers...'));
    console.log(`目標 URL: ${url}`);

    const response = await makeRequest(url);
    const results = {};

    // 驗證每個 Header
    Object.entries(REQUIRED_HEADERS).forEach(([headerKey, config]) => {
      const headerValue = response.headers[headerKey] || response.headers[headerKey.toLowerCase()];
      results[headerKey] = validateHeader(headerKey, headerValue, config);
    });

    // 生成報告
    const passed = generateReport(url, results, response);

    // 退出碼
    process.exit(passed ? 0 : 1);

  } catch (error) {
    console.error(colors.red(`❌ 檢測失敗: ${error.message}`));
    
    if (error.code === 'ENOTFOUND') {
      console.error('   • 請檢查 URL 是否正確');
      console.error('   • 確認網站是否可訪問');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   • 連接被拒絕，請檢查服務是否運行');
    } else if (error.message === 'Request timeout') {
      console.error('   • 請求超時，請檢查網路連接');
    }
    
    process.exit(1);
  }
}

// 如果直接執行此腳本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { validateHeader, REQUIRED_HEADERS };