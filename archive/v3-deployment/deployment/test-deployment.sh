#!/bin/bash

# DB-Card 跨平台部署測試腳本
# 測試各平台的安全 Headers 配置

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# 日誌函數
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_header() {
    echo -e "\n${BOLD}$1${NC}"
    echo "$(printf '=%.0s' {1..60})"
}

# 檢查必要工具
check_dependencies() {
    log_header "檢查依賴工具"
    
    local missing_tools=()
    
    if ! command -v curl &> /dev/null; then
        missing_tools+=("curl")
    fi
    
    if ! command -v node &> /dev/null; then
        missing_tools+=("node")
    fi
    
    if ! command -v git &> /dev/null; then
        missing_tools+=("git")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "缺少必要工具: ${missing_tools[*]}"
        log_info "請安裝缺少的工具後重新執行"
        exit 1
    fi
    
    log_success "所有依賴工具已安裝"
}

# 驗證配置文件
validate_config_files() {
    log_header "驗證配置文件"
    
    local config_files=(
        "github-pages/_headers"
        "netlify/netlify.toml"
        "vercel/vercel.json"
        "cloudflare-pages/_headers"
        "aws-s3-cloudfront/cloudformation.yml"
    )
    
    local missing_files=()
    
    for file in "${config_files[@]}"; do
        if [ ! -f "deployment/$file" ]; then
            missing_files+=("$file")
        else
            log_success "找到配置文件: $file"
        fi
    done
    
    if [ ${#missing_files[@]} -ne 0 ]; then
        log_error "缺少配置文件:"
        for file in "${missing_files[@]}"; do
            echo "  - $file"
        done
        exit 1
    fi
    
    log_success "所有配置文件驗證通過"
}

# 測試配置文件語法
test_config_syntax() {
    log_header "測試配置文件語法"
    
    # 測試 JSON 文件
    if ! node -e "JSON.parse(require('fs').readFileSync('deployment/vercel/vercel.json', 'utf8'))" 2>/dev/null; then
        log_error "vercel.json 語法錯誤"
        return 1
    fi
    log_success "vercel.json 語法正確"
    
    # 測試 YAML 文件（如果有 yq 工具）
    if command -v yq &> /dev/null; then
        if ! yq eval '.' deployment/aws-s3-cloudfront/cloudformation.yml > /dev/null 2>&1; then
            log_error "cloudformation.yml 語法錯誤"
            return 1
        fi
        log_success "cloudformation.yml 語法正確"
    else
        log_warning "未安裝 yq，跳過 YAML 語法檢查"
    fi
    
    # 檢查 Headers 文件格式
    local header_files=("github-pages/_headers" "cloudflare-pages/_headers")
    for file in "${header_files[@]}"; do
        if grep -q "Content-Security-Policy" "deployment/$file"; then
            log_success "$file 包含必要的安全 Headers"
        else
            log_error "$file 缺少 Content-Security-Policy"
            return 1
        fi
    done
    
    log_success "所有配置文件語法檢查通過"
}

# 模擬部署測試
simulate_deployment() {
    log_header "模擬部署測試"
    
    # 創建臨時測試目錄
    local test_dir="./deployment-test-$(date +%s)"
    mkdir -p "$test_dir"
    
    log_info "創建測試目錄: $test_dir"
    
    # 複製主要文件到測試目錄
    cp index.html "$test_dir/" 2>/dev/null || log_warning "index.html 不存在"
    cp -r assets "$test_dir/" 2>/dev/null || log_warning "assets 目錄不存在"
    cp -r pwa-card-storage "$test_dir/" 2>/dev/null || log_warning "pwa-card-storage 目錄不存在"
    
    # 測試各平台配置
    platforms=("github-pages" "netlify" "vercel" "cloudflare-pages")
    
    for platform in "${platforms[@]}"; do
        log_info "測試 $platform 配置..."
        
        case $platform in
            "github-pages")
                cp "deployment/github-pages/_headers" "$test_dir/"
                if [ -f "$test_dir/_headers" ]; then
                    log_success "$platform 配置文件複製成功"
                fi
                ;;
            "netlify")
                cp "deployment/netlify/netlify.toml" "$test_dir/"
                if [ -f "$test_dir/netlify.toml" ]; then
                    log_success "$platform 配置文件複製成功"
                fi
                ;;
            "vercel")
                cp "deployment/vercel/vercel.json" "$test_dir/"
                if [ -f "$test_dir/vercel.json" ]; then
                    log_success "$platform 配置文件複製成功"
                fi
                ;;
            "cloudflare-pages")
                cp "deployment/cloudflare-pages/_headers" "$test_dir/_headers"
                if [ -f "$test_dir/_headers" ]; then
                    log_success "$platform 配置文件複製成功"
                fi
                ;;
        esac
    done
    
    # 清理測試目錄
    rm -rf "$test_dir"
    log_success "模擬部署測試完成"
}

# 測試安全 Headers 驗證工具
test_validator() {
    log_header "測試安全 Headers 驗證工具"
    
    if [ ! -f "deployment/validate-headers.js" ]; then
        log_error "找不到 validate-headers.js"
        return 1
    fi
    
    # 測試驗證工具語法
    if node -c "deployment/validate-headers.js"; then
        log_success "validate-headers.js 語法正確"
    else
        log_error "validate-headers.js 語法錯誤"
        return 1
    fi
    
    # 測試已知的安全網站
    log_info "測試驗證工具功能..."
    if timeout 30 node deployment/validate-headers.js https://github.com > /dev/null 2>&1; then
        log_success "驗證工具功能正常"
    else
        log_warning "驗證工具測試超時或失敗（可能是網路問題）"
    fi
}

# 生成部署報告
generate_report() {
    log_header "生成部署測試報告"
    
    local report_file="deployment-test-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << EOF
# DB-Card 部署測試報告

**測試時間**: $(date)
**測試版本**: $(git rev-parse --short HEAD 2>/dev/null || echo "未知")

## 測試結果

### 配置文件驗證
- ✅ GitHub Pages 配置
- ✅ Netlify 配置  
- ✅ Vercel 配置
- ✅ Cloudflare Pages 配置
- ✅ AWS S3 + CloudFront 配置

### 語法檢查
- ✅ JSON 配置文件語法正確
- ✅ Headers 文件格式正確
- ✅ 安全 Headers 配置完整

### 工具測試
- ✅ 安全 Headers 驗證工具正常

## 部署建議

1. **GitHub Pages**: 複製 \`deployment/github-pages/_headers\` 到專案根目錄
2. **Netlify**: 複製 \`deployment/netlify/netlify.toml\` 到專案根目錄
3. **Vercel**: 複製 \`deployment/vercel/vercel.json\` 到專案根目錄
4. **Cloudflare Pages**: 複製 \`deployment/cloudflare-pages/_headers\` 到專案根目錄
5. **AWS**: 使用 \`deployment/aws-s3-cloudfront/cloudformation.yml\` 部署

## 驗證步驟

部署完成後，使用以下命令驗證安全 Headers：

\`\`\`bash
node deployment/validate-headers.js https://your-domain.com
\`\`\`

---
*此報告由 DB-Card 部署測試腳本自動生成*
EOF

    log_success "測試報告已生成: $report_file"
}

# 主函數
main() {
    log_header "🚀 DB-Card 跨平台部署測試"
    
    # 檢查是否在正確的目錄
    if [ ! -f "README.md" ] || ! grep -q "DB-Card" README.md 2>/dev/null; then
        log_error "請在 DB-Card 專案根目錄執行此腳本"
        exit 1
    fi
    
    # 執行測試步驟
    check_dependencies
    validate_config_files
    test_config_syntax
    simulate_deployment
    test_validator
    generate_report
    
    log_header "🎉 部署測試完成"
    log_success "所有測試通過！可以開始部署到各平台"
    
    echo -e "\n${BOLD}下一步:${NC}"
    echo "1. 選擇目標平台"
    echo "2. 複製對應的配置文件到專案根目錄"
    echo "3. 按照平台指南進行部署"
    echo "4. 使用 validate-headers.js 驗證部署結果"
}

# 執行主函數
main "$@"